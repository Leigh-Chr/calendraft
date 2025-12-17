// SPDX-License-Identifier: AGPL-3.0
// Copyright (C) 2024 Calendraft
/**
 * Calendar group members management
 * Handles invitations, member management, and access control for shared groups
 */

import { sendGroupInvitationEmail } from "@calendraft/auth/lib/email";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { protectedProcedure, router } from "../../../index";
import { handlePrismaError } from "../../../lib/prisma-error-handler";
import {
	isGroupOwner,
	verifyGroupAccessOrThrow,
} from "../../../middleware/access";

// Get frontend URL from environment
const frontendURL = process.env["CORS_ORIGIN"] || "http://localhost:3001";

export const calendarGroupMembersRouter = router({
	/**
	 * Invite a user to a group by email
	 * Only the group owner can invite members
	 */
	inviteMember: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				userEmail: z.string().email("Invalid email address"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const inviterId = ctx.session.user.id;

			// Verify that the inviter is the owner of the group
			const isOwner = await isGroupOwner(input.groupId, ctx);
			if (!isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the group owner can invite members",
				});
			}

			// Find user by email (normalized email for Better-Auth compatibility)
			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{ email: input.userEmail },
						{ normalizedEmail: input.userEmail.toLowerCase() },
					],
				},
				select: {
					id: true,
					email: true,
					name: true,
				},
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found with this email address",
				});
			}

			// Check if user is already a member
			const existingMember = await prisma.groupMember.findUnique({
				where: {
					groupId_userId: {
						groupId: input.groupId,
						userId: user.id,
					},
				},
			});

			if (existingMember) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "User is already a member of this group",
				});
			}

			// Check if user is trying to invite themselves
			if (user.id === inviterId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You are already the owner of this group",
				});
			}

			// Get group info for email
			const group = await prisma.calendarGroup.findUnique({
				where: { id: input.groupId },
				select: { name: true },
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// Get inviter info for email
			const inviter = await prisma.user.findUnique({
				where: { id: inviterId },
				select: { name: true, email: true },
			});

			// Create invitation (acceptedAt = null means pending)
			let member: Awaited<ReturnType<typeof prisma.groupMember.create>>;
			try {
				member = await prisma.groupMember.create({
					data: {
						groupId: input.groupId,
						userId: user.id,
						role: "MEMBER",
						invitedBy: inviterId,
						acceptedAt: null, // Pending invitation
					},
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

			// Send invitation email
			const acceptUrl = `${frontendURL}/groups/${input.groupId}/accept-invitation`;
			void sendGroupInvitationEmail({
				to: user.email,
				groupName: group.name,
				inviterName: inviter?.name || inviter?.email || "Someone",
				acceptUrl,
			});

			// Return member info
			return {
				id: member.id,
				userId: member.userId,
				role: member.role,
				invitedAt: member.invitedAt,
				acceptedAt: member.acceptedAt,
				user: {
					id: user.id,
					email: user.email,
					name: user.name,
				},
				groupName: group.name,
			};
		}),

	/**
	 * Accept a group invitation
	 * User must be authenticated and have a pending invitation
	 */
	acceptInvitation: protectedProcedure
		.input(z.object({ groupId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const userId = ctx.session.user.id;

			// Find pending invitation
			const member = await prisma.groupMember.findUnique({
				where: {
					groupId_userId: {
						groupId: input.groupId,
						userId,
					},
				},
			});

			if (!member) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Invitation not found",
				});
			}

			if (member.acceptedAt !== null) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Invitation has already been accepted",
				});
			}

			// Accept invitation
			try {
				const updated = await prisma.groupMember.update({
					where: {
						id: member.id,
					},
					data: {
						acceptedAt: new Date(),
					},
					include: {
						group: {
							select: {
								name: true,
							},
						},
					},
				});

				return {
					id: updated.id,
					groupId: updated.groupId,
					role: updated.role,
					acceptedAt: updated.acceptedAt,
					groupName: updated.group.name,
				};
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}
		}),

	/**
	 * List all members of a group
	 * Accessible to both owners and members
	 */
	listMembers: protectedProcedure
		.input(z.object({ groupId: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			// Verify access (owner or member)
			await verifyGroupAccessOrThrow(input.groupId, ctx);

			// Get all members with user information
			const members = await prisma.groupMember.findMany({
				where: {
					groupId: input.groupId,
				},
				include: {
					// Note: We need to manually join with User table since there's no relation
					// We'll fetch user info separately for each member
				},
				orderBy: [
					{ role: "asc" }, // OWNER first
					{ acceptedAt: "asc" }, // Accepted members before pending
					{ invitedAt: "asc" },
				],
			});

			// Fetch user information for each member
			const membersWithUserInfo = await Promise.all(
				members.map(async (member) => {
					const user = await prisma.user.findUnique({
						where: { id: member.userId },
						select: {
							id: true,
							email: true,
							name: true,
						},
					});

					// Get inviter info
					const inviter = await prisma.user.findUnique({
						where: { id: member.invitedBy },
						select: {
							id: true,
							name: true,
							email: true,
						},
					});

					return {
						id: member.id,
						userId: member.userId,
						role: member.role,
						invitedBy: member.invitedBy,
						invitedAt: member.invitedAt,
						acceptedAt: member.acceptedAt,
						user: user
							? {
									id: user.id,
									email: user.email,
									name: user.name,
								}
							: null,
						inviter: inviter
							? {
									id: inviter.id,
									name: inviter.name,
									email: inviter.email,
								}
							: null,
					};
				}),
			);

			return membersWithUserInfo;
		}),

	/**
	 * Remove a member from a group
	 * Only the group owner can remove members
	 */
	removeMember: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				userId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			// Verify that the caller is the owner
			const isOwner = await isGroupOwner(input.groupId, ctx);
			if (!isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the group owner can remove members",
				});
			}

			// Find the member to remove
			const member = await prisma.groupMember.findUnique({
				where: {
					groupId_userId: {
						groupId: input.groupId,
						userId: input.userId,
					},
				},
			});

			if (!member) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Member not found",
				});
			}

			// Check if trying to remove the last owner
			if (member.role === "OWNER") {
				// Count how many owners exist
				const ownerCount = await prisma.groupMember.count({
					where: {
						groupId: input.groupId,
						role: "OWNER",
					},
				});

				if (ownerCount <= 1) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"Cannot remove the last owner. Transfer ownership or delete the group instead.",
					});
				}
			}

			// Remove member
			try {
				await prisma.groupMember.delete({
					where: {
						id: member.id,
					},
				});

				return { success: true };
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}
		}),

	/**
	 * Leave a group
	 * Members can leave, but owners cannot (must transfer ownership or delete group)
	 */
	leaveGroup: protectedProcedure
		.input(z.object({ groupId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			const userId = ctx.session.user.id;

			// Find the member
			const member = await prisma.groupMember.findUnique({
				where: {
					groupId_userId: {
						groupId: input.groupId,
						userId,
					},
				},
			});

			if (!member) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "You are not a member of this group",
				});
			}

			// Check if user is the owner
			if (member.role === "OWNER") {
				// Check if there are other owners
				const ownerCount = await prisma.groupMember.count({
					where: {
						groupId: input.groupId,
						role: "OWNER",
					},
				});

				if (ownerCount <= 1) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"Owners cannot leave a group. Transfer ownership to another member or delete the group instead.",
					});
				}
			}

			// Remove member
			try {
				await prisma.groupMember.delete({
					where: {
						id: member.id,
					},
				});

				return { success: true };
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}
		}),

	/**
	 * Update a member's role
	 * Only the group owner can update roles
	 */
	updateMemberRole: protectedProcedure
		.input(
			z.object({
				groupId: z.string(),
				userId: z.string(),
				role: z.enum(["OWNER", "MEMBER"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "Authentication required",
				});
			}

			// Verify that the caller is the owner
			const isOwner = await isGroupOwner(input.groupId, ctx);
			if (!isOwner) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only the group owner can update member roles",
				});
			}

			// Find the member
			const member = await prisma.groupMember.findUnique({
				where: {
					groupId_userId: {
						groupId: input.groupId,
						userId: input.userId,
					},
				},
			});

			if (!member) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Member not found",
				});
			}

			// If demoting the last owner, prevent it
			if (member.role === "OWNER" && input.role === "MEMBER") {
				const ownerCount = await prisma.groupMember.count({
					where: {
						groupId: input.groupId,
						role: "OWNER",
					},
				});

				if (ownerCount <= 1) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message:
							"Cannot demote the last owner. There must be at least one owner in the group.",
					});
				}
			}

			// Update role
			try {
				const updated = await prisma.groupMember.update({
					where: {
						id: member.id,
					},
					data: {
						role: input.role,
					},
				});

				return {
					id: updated.id,
					userId: updated.userId,
					role: updated.role,
				};
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}
		}),
});
