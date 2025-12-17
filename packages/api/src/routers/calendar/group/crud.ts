/**
 * Calendar group CRUD operations
 * Extracted from group.ts for better maintainability
 */

import { ANONYMOUS_LIMITS, AUTHENTICATED_LIMITS } from "@calendraft/core";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../../index";
import { handlePrismaError } from "../../../lib/prisma-error-handler";
import { buildOwnershipFilter } from "../../../middleware";
import {
	isGroupOwner,
	verifyGroupAccessOrThrow,
} from "../../../middleware/access";

export const calendarGroupCrudRouter = router({
	/**
	 * Create a new calendar group
	 */
	create: authOrAnonProcedure
		.input(
			z.object({
				name: z.string().min(1).max(200),
				description: z.string().max(500).optional(),
				color: z
					.string()
					.regex(
						/^#[0-9A-Fa-f]{6}$/,
						"Invalid color format (expected: #RRGGBB)",
					)
					.optional()
					.nullable(),
				calendarIds: z.array(z.string()).min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAuth = !!ctx.session?.user?.id;
			const userId = ctx.session?.user?.id || ctx.anonymousId;

			if (!userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User identifier required",
				});
			}

			// Check group limit
			const groupCount = await prisma.calendarGroup.count({
				where: buildOwnershipFilter(ctx),
			});

			const maxGroups = isAuth
				? AUTHENTICATED_LIMITS.groups
				: ANONYMOUS_LIMITS.groups;

			if (groupCount >= maxGroups) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Limit reached: you can only create ${maxGroups} groups`,
				});
			}

			// Check calendars per group limit
			const maxCalendarsPerGroup = isAuth
				? AUTHENTICATED_LIMITS.calendarsPerGroup
				: ANONYMOUS_LIMITS.calendarsPerGroup;

			if (input.calendarIds.length > maxCalendarsPerGroup) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Limit reached: you can only add ${maxCalendarsPerGroup} calendars per group`,
				});
			}

			// Verify the user owns all calendars
			const calendars = await prisma.calendar.findMany({
				where: {
					id: { in: input.calendarIds },
					...buildOwnershipFilter(ctx),
				},
			});

			if (calendars.length !== input.calendarIds.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "One or more calendars not found",
				});
			}

			// Create group
			let group: Awaited<ReturnType<typeof prisma.calendarGroup.create>>;
			try {
				group = await prisma.calendarGroup.create({
					data: {
						name: input.name,
						description: input.description || null,
						color: input.color || null,
						userId,
						calendars: {
							create: input.calendarIds.map((calendarId, index) => ({
								calendarId,
								order: index,
							})),
						},
					},
					include: {
						calendars: {
							include: {
								group: false, // Avoid circular reference
							},
						},
					},
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

			return group;
		}),

	/**
	 * Get groups that contain a specific calendar
	 */
	getByCalendarId: authOrAnonProcedure
		.input(z.object({ calendarId: z.string() }))
		.query(async ({ ctx, input }) => {
			// First verify the calendar exists and belongs to the user
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Get groups containing this calendar
			const groupMembers = await prisma.calendarGroupMember.findMany({
				where: {
					calendarId: input.calendarId,
				},
				include: {
					group: true,
				},
			});

			// Filter groups by ownership in memory
			// buildOwnershipFilter returns { OR: [{ userId: ... }, { userId: ... }] }
			const userId = ctx.session?.user?.id || ctx.anonymousId;
			return groupMembers
				.map((member) => member.group)
				.filter((group): group is NonNullable<typeof group> => {
					if (!group) return false;
					return group.userId === userId;
				})
				.map((group) => ({
					id: group.id,
					name: group.name,
					color: group.color,
				}));
		}),

	/**
	 * List all groups for the current user
	 * Includes groups where user is owner or member (for authenticated users)
	 */
	list: authOrAnonProcedure.query(async ({ ctx }) => {
		// For authenticated users, include groups where they are members
		if (ctx.session?.user?.id) {
			const userId = ctx.session.user.id;

			// Get groups where user is owner
			const ownedGroups = await prisma.calendarGroup.findMany({
				where: { userId },
				include: {
					_count: {
						select: { calendars: true, members: true },
					},
				},
				orderBy: {
					updatedAt: "desc",
				},
			});

			// Get groups where user is a member (with accepted invitation)
			const memberGroups = await prisma.groupMember.findMany({
				where: {
					userId,
					acceptedAt: { not: null },
				},
				include: {
					group: {
						include: {
							_count: {
								select: { calendars: true, members: true },
							},
						},
					},
				},
				orderBy: {
					group: {
						updatedAt: "desc",
					},
				},
			});

			// Combine and deduplicate (user might be both owner and member)
			const groupIds = new Set<string>();
			const allGroups: Array<{
				id: string;
				name: string;
				description: string | null;
				color: string | null;
				calendarCount: number;
				memberCount: number;
				isShared: boolean;
				createdAt: Date;
				updatedAt: Date;
			}> = [];

			for (const group of ownedGroups) {
				if (!groupIds.has(group.id)) {
					groupIds.add(group.id);
					allGroups.push({
						id: group.id,
						name: group.name,
						description: group.description,
						color: group.color,
						calendarCount: group._count.calendars,
						memberCount: group._count.members,
						isShared: group._count.members > 0,
						createdAt: group.createdAt,
						updatedAt: group.updatedAt,
					});
				}
			}

			for (const member of memberGroups) {
				if (!groupIds.has(member.group.id)) {
					groupIds.add(member.group.id);
					allGroups.push({
						id: member.group.id,
						name: member.group.name,
						description: member.group.description,
						color: member.group.color,
						calendarCount: member.group._count.calendars,
						memberCount: member.group._count.members,
						isShared: member.group._count.members > 0,
						createdAt: member.group.createdAt,
						updatedAt: member.group.updatedAt,
					});
				}
			}

			return allGroups;
		}

		// For anonymous users, only show owned groups (no shared groups)
		const groups = await prisma.calendarGroup.findMany({
			where: buildOwnershipFilter(ctx),
			include: {
				_count: {
					select: { calendars: true, members: true },
				},
			},
			orderBy: {
				updatedAt: "desc",
			},
		});

		return groups.map((group) => ({
			id: group.id,
			name: group.name,
			description: group.description,
			color: group.color,
			calendarCount: group._count.calendars,
			memberCount: group._count.members,
			isShared: group._count.members > 0,
			createdAt: group.createdAt,
			updatedAt: group.updatedAt,
		}));
	}),

	/**
	 * Get a group by ID
	 * Accessible to owners and members (for authenticated users)
	 */
	getById: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			// For authenticated users, check group access (owner or member)
			if (ctx.session?.user?.id) {
				// Verify access (will throw if no access)
				await verifyGroupAccessOrThrow(input.id, ctx);
			}

			// Fetch group with all details
			const group = await prisma.calendarGroup.findUnique({
				where: { id: input.id },
				include: {
					calendars: {
						orderBy: {
							order: "asc",
						},
						include: {
							group: false, // Avoid circular reference
						},
					},
					members: {
						orderBy: [
							{ role: "asc" }, // OWNER first
							{ acceptedAt: "asc" }, // Accepted before pending
							{ invitedAt: "asc" },
						],
					},
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// For anonymous users, verify ownership
			if (!ctx.session?.user?.id) {
				const ownershipFilter = buildOwnershipFilter(ctx);
				const hasAccess =
					(ownershipFilter.OR?.some(
						(condition) =>
							"userId" in condition && condition.userId === group.userId,
					) ??
						false) ||
					group.userId === null;

				if (!hasAccess) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Access denied to this group",
					});
				}
			}

			// Get calendar details for each member
			// For shared groups, members can access calendars even if not owner
			const calendarIds = group.calendars.map((c) => c.calendarId);

			// Build calendar access filter: owned OR in shared group
			const calendarWhere: {
				id: { in: string[] };
				OR?: Array<{ userId: string }>;
			} = {
				id: { in: calendarIds },
			};

			// If authenticated and group has members, allow access to all calendars in group
			if (ctx.session?.user?.id && group.members.length > 0) {
				// User has access via group membership, fetch all calendars
				// No need to filter by ownership
			} else {
				// Filter by ownership for personal groups or anonymous users
				calendarWhere.OR = buildOwnershipFilter(ctx).OR;
			}

			const calendars = await prisma.calendar.findMany({
				where: calendarWhere,
				include: {
					_count: {
						select: { events: true },
					},
				},
			});

			// Map calendars by ID for quick lookup
			const calendarsMap = new Map(calendars.map((c) => [c.id, c]));

			// Transform group.calendars to include calendar details
			const calendarsWithDetails = group.calendars
				.map((member) => {
					const calendar = calendarsMap.get(member.calendarId);
					if (!calendar) return null;
					return {
						id: calendar.id,
						name: calendar.name,
						color: calendar.color,
						eventCount: calendar._count.events,
						sourceUrl: calendar.sourceUrl,
						lastSyncedAt: calendar.lastSyncedAt,
						createdAt: calendar.createdAt,
						updatedAt: calendar.updatedAt,
						order: member.order,
					};
				})
				.filter((c): c is NonNullable<typeof c> => c !== null);

			// Fetch user information for members
			const membersWithUserInfo = await Promise.all(
				group.members.map(async (member) => {
					const user = await prisma.user.findUnique({
						where: { id: member.userId },
						select: {
							id: true,
							email: true,
							name: true,
						},
					});

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

			return {
				...group,
				calendars: calendarsWithDetails,
				members: membersWithUserInfo,
				isShared: group.members.length > 0,
			};
		}),

	/**
	 * Update a group
	 * Only owners can update group details
	 */
	update: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().min(1).max(200).optional(),
				description: z.string().max(500).optional().nullable(),
				color: z
					.string()
					.regex(
						/^#[0-9A-Fa-f]{6}$/,
						"Invalid color format (expected: #RRGGBB)",
					)
					.optional()
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// For authenticated users, verify owner access
			if (ctx.session?.user?.id) {
				const isOwner = await isGroupOwner(input.id, ctx);
				if (!isOwner) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Only the group owner can update group details",
					});
				}
			}

			// Find the group (for anonymous users, use ownership filter)
			const group = await prisma.calendarGroup.findFirst({
				where: {
					id: input.id,
					...(ctx.session?.user?.id
						? { userId: ctx.session.user.id }
						: buildOwnershipFilter(ctx)),
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// Update group
			const updateData: {
				name?: string;
				description?: string | null;
				color?: string | null;
			} = {};

			if (input.name !== undefined) {
				updateData.name = input.name;
			}
			if (input.description !== undefined) {
				updateData.description = input.description;
			}
			if (input.color !== undefined) {
				updateData.color = input.color;
			}

			try {
				return await prisma.calendarGroup.update({
					where: { id: input.id },
					data: updateData,
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}
		}),

	/**
	 * Delete a group
	 * Only owners can delete groups
	 */
	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// For authenticated users, verify owner access
			if (ctx.session?.user?.id) {
				const isOwner = await isGroupOwner(input.id, ctx);
				if (!isOwner) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Only the group owner can delete the group",
					});
				}
			}

			// Find the group (for anonymous users, use ownership filter)
			const group = await prisma.calendarGroup.findFirst({
				where: {
					id: input.id,
					...(ctx.session?.user?.id
						? { userId: ctx.session.user.id }
						: buildOwnershipFilter(ctx)),
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// Delete group (cascade will delete members and calendar group members)
			try {
				await prisma.calendarGroup.delete({
					where: { id: input.id },
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

			return { success: true };
		}),
});
