/**
 * Calendar group CRUD operations
 * Extracted from group.ts for better maintainability
 */

import { ANONYMOUS_LIMITS, AUTHENTICATED_LIMITS } from "@calendraft/core";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../../index";
import { buildOwnershipFilter } from "../../../middleware";

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
			const group = await prisma.calendarGroup.create({
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
	 */
	list: authOrAnonProcedure.query(async ({ ctx }) => {
		const groups = await prisma.calendarGroup.findMany({
			where: buildOwnershipFilter(ctx),
			include: {
				_count: {
					select: { calendars: true },
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
			createdAt: group.createdAt,
			updatedAt: group.updatedAt,
		}));
	}),

	/**
	 * Get a group by ID
	 */
	getById: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const group = await prisma.calendarGroup.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
				include: {
					calendars: {
						orderBy: {
							order: "asc",
						},
						include: {
							group: false, // Avoid circular reference
						},
					},
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// Get calendar details for each member
			const calendarIds = group.calendars.map((c) => c.calendarId);
			const calendars = await prisma.calendar.findMany({
				where: {
					id: { in: calendarIds },
					...buildOwnershipFilter(ctx),
				},
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

			return {
				...group,
				calendars: calendarsWithDetails,
			};
		}),

	/**
	 * Update a group
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
			// Find the group
			const group = await prisma.calendarGroup.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
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

			return await prisma.calendarGroup.update({
				where: { id: input.id },
				data: updateData,
			});
		}),

	/**
	 * Delete a group
	 */
	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Find the group
			const group = await prisma.calendarGroup.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// Delete group (cascade will delete members)
			await prisma.calendarGroup.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
});
