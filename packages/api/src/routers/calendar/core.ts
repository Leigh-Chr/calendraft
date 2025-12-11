/**
 * Core calendar CRUD operations
 * Extracted from calendar.ts for better maintainability
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../index";
import {
	buildOwnershipFilter,
	checkCalendarLimit,
	getUserUsage,
} from "../../middleware";

export const calendarCoreRouter = router({
	list: authOrAnonProcedure
		.input(
			z
				.object({
					filterGroups: z.array(z.string()).optional(),
					limit: z.number().int().min(1).max(100).optional().default(50),
					cursor: z.string().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const limit = input?.limit ?? 50;
			const cursor = input?.cursor;

			// Build where clause with cursor support
			const where: {
				OR: Array<{ userId: string }>;
				id?: { gt: string };
			} = {
				...buildOwnershipFilter(ctx),
			};

			if (cursor) {
				where.id = { gt: cursor };
			}

			// Fetch one extra to determine if there's a next page
			const calendarsRaw = await prisma.calendar.findMany({
				where,
				include: {
					_count: {
						select: { events: true },
					},
				},
				orderBy: {
					updatedAt: "desc",
				},
				take: limit + 1,
			});

			// Filter by groups if specified
			let calendars = calendarsRaw;
			if (input?.filterGroups && input.filterGroups.length > 0) {
				// Get all calendar IDs that belong to the specified groups
				const groupMembers = await prisma.calendarGroupMember.findMany({
					where: {
						groupId: { in: input.filterGroups },
					},
					select: { calendarId: true },
				});

				const calendarIdsInGroups = new Set(
					groupMembers.map((m) => m.calendarId),
				);

				// Filter calendars to only those in the specified groups
				calendars = calendars.filter((cal) => calendarIdsInGroups.has(cal.id));
			}

			// Determine next cursor
			let nextCursor: string | undefined;
			if (calendars.length > limit) {
				const nextItem = calendars.pop();
				nextCursor = nextItem?.id;
			}

			// Update updatedAt for all calendars on list access (for anonymous users only)
			// This prevents cleanup of calendars that are still being accessed
			// Only do this for anonymous users to avoid unnecessary DB writes for authenticated users
			if (ctx.anonymousId && calendars.length > 0) {
				const calendarIds = calendars.map((cal) => cal.id);
				await prisma.calendar.updateMany({
					where: {
						id: { in: calendarIds },
						userId: ctx.anonymousId,
					},
					data: { updatedAt: new Date() },
				});
			}

			return {
				calendars: calendars.map((cal) => ({
					id: cal.id,
					name: cal.name,
					color: cal.color,
					eventCount: cal._count.events,
					sourceUrl: cal.sourceUrl,
					lastSyncedAt: cal.lastSyncedAt,
					createdAt: cal.createdAt,
					updatedAt: cal.updatedAt,
				})),
				nextCursor,
			};
		}),

	getById: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			// Single query to check existence, ownership, and fetch data
			// Use findUnique first to check existence, then verify ownership
			const calendar = await prisma.calendar.findUnique({
				where: { id: input.id },
				include: {
					events: {
						orderBy: {
							startDate: "asc",
						},
					},
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Verify ownership in a single check
			const ownershipFilter = buildOwnershipFilter(ctx);
			const hasAccess =
				(ownershipFilter.OR?.some(
					(condition) =>
						"userId" in condition && condition.userId === calendar.userId,
				) ??
					false) ||
				calendar.userId === null;

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied to this calendar",
				});
			}

			// Update updatedAt on access to prevent cleanup of actively used calendars
			// This ensures that calendars that are viewed (even if not modified) are not considered orphaned
			// Use updateMany to avoid another query if not needed
			if (ctx.anonymousId) {
				await prisma.calendar.updateMany({
					where: {
						id: input.id,
						userId: ctx.anonymousId,
					},
					data: { updatedAt: new Date() },
				});
			}

			return calendar;
		}),

	create: authOrAnonProcedure
		.input(
			z.object({
				name: z
					.string()
					.trim()
					.min(1)
					.max(200)
					.transform((val) => val.trim()), // Max length validation with auto-trimming
				color: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color (format: #RRGGBB)")
					.optional()
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await checkCalendarLimit(ctx);

			const calendar = await prisma.calendar.create({
				data: {
					name: input.name, // Already trimmed by Zod transform
					color: input.color || null,
					userId: ctx.session?.user?.id || ctx.anonymousId || null,
				},
			});

			return calendar;
		}),

	update: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				name: z
					.string()
					.trim()
					.min(1)
					.max(200)
					.transform((val) => val.trim())
					.optional(), // Now optional for partial updates
				color: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color (format: #RRGGBB)")
					.optional()
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Single query to check existence and ownership
			const calendar = await prisma.calendar.findUnique({
				where: { id: input.id },
				select: { id: true, userId: true },
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Verify ownership
			const ownershipFilter = buildOwnershipFilter(ctx);
			const hasAccess =
				(ownershipFilter.OR?.some(
					(condition) =>
						"userId" in condition && condition.userId === calendar.userId,
				) ??
					false) ||
				calendar.userId === null;

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied to this calendar",
				});
			}

			const updateData: { name?: string; color?: string | null } = {};
			if (input.name !== undefined) {
				updateData.name = input.name;
			}
			if (input.color !== undefined) {
				updateData.color = input.color;
			}

			return await prisma.calendar.update({
				where: { id: input.id },
				data: updateData,
			});
		}),

	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Single query to check existence and ownership
			const calendar = await prisma.calendar.findUnique({
				where: { id: input.id },
				select: { id: true, userId: true },
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Verify ownership
			const ownershipFilter = buildOwnershipFilter(ctx);
			const hasAccess =
				(ownershipFilter.OR?.some(
					(condition) =>
						"userId" in condition && condition.userId === calendar.userId,
				) ??
					false) ||
				calendar.userId === null;

			if (!hasAccess) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied to this calendar",
				});
			}

			await prisma.calendar.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	/**
	 * Bulk delete multiple calendars
	 */
	bulkDelete: authOrAnonProcedure
		.input(
			z.object({
				calendarIds: z.array(z.string()).min(1).max(100),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get all calendars and verify they belong to the user
			const calendars = await prisma.calendar.findMany({
				where: {
					id: { in: input.calendarIds },
					...buildOwnershipFilter(ctx),
				},
			});

			if (calendars.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No calendars found",
				});
			}

			// Get accessible calendar IDs
			const accessibleCalendarIds = calendars.map((c) => c.id);

			// Delete accessible calendars (cascade will delete events)
			const result = await prisma.calendar.deleteMany({
				where: { id: { in: accessibleCalendarIds } },
			});

			return {
				deletedCount: result.count,
				requestedCount: input.calendarIds.length,
			};
		}),

	/**
	 * Get usage statistics for the current user
	 * Returns limits and current usage (useful for anonymous users)
	 */
	getUsage: authOrAnonProcedure.query(async ({ ctx }) => {
		const usage = await getUserUsage(ctx);
		return usage;
	}),
});
