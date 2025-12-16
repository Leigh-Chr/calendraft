/**
 * Calendar group calendar management operations
 * Extracted from group.ts for better maintainability
 */

import { ANONYMOUS_LIMITS, AUTHENTICATED_LIMITS } from "@calendraft/core";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../../index";
import { handlePrismaError } from "../../../lib/prisma-error-handler";
import { buildOwnershipFilter } from "../../../middleware";

export const calendarGroupCalendarsRouter = router({
	/**
	 * Add calendars to a group
	 */
	addCalendars: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				calendarIds: z.array(z.string()).min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const isAuth = !!ctx.session?.user?.id;

			// Find the group
			const group = await prisma.calendarGroup.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
				include: {
					calendars: true,
				},
			});

			if (!group) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Group not found",
				});
			}

			// Check calendars per group limit
			const maxCalendarsPerGroup = isAuth
				? AUTHENTICATED_LIMITS.calendarsPerGroup
				: ANONYMOUS_LIMITS.calendarsPerGroup;
			const currentCount = group.calendars.length;
			const newCount = currentCount + input.calendarIds.length;
			if (newCount > maxCalendarsPerGroup) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Limit reached: you can only add ${maxCalendarsPerGroup} calendars per group. Current: ${currentCount}, trying to add: ${input.calendarIds.length}`,
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

			// Filter out calendars already in the group
			const existingCalendarIds = new Set(
				group.calendars.map((c) => c.calendarId),
			);
			const newCalendarIds = input.calendarIds.filter(
				(id) => !existingCalendarIds.has(id),
			);

			if (newCalendarIds.length === 0) {
				return {
					addedCount: 0,
					message: "All calendars are already in the group",
				};
			}

			// Get the highest order in the group
			const maxOrder =
				group.calendars.length > 0
					? Math.max(...group.calendars.map((c) => c.order))
					: -1;

			// Add calendars
			try {
				await prisma.calendarGroupMember.createMany({
					data: newCalendarIds.map((calendarId, index) => ({
						groupId: input.id,
						calendarId,
						order: maxOrder + 1 + index,
					})),
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

			return {
				addedCount: newCalendarIds.length,
				message: `Added ${newCalendarIds.length} calendar(s) to the group`,
			};
		}),

	/**
	 * Remove calendars from a group
	 */
	removeCalendars: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				calendarIds: z.array(z.string()).min(1),
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

			// Remove calendars
			let result: Awaited<
				ReturnType<typeof prisma.calendarGroupMember.deleteMany>
			>;
			try {
				result = await prisma.calendarGroupMember.deleteMany({
					where: {
						groupId: input.id,
						calendarId: { in: input.calendarIds },
					},
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

			return {
				removedCount: result.count,
				message: `Removed ${result.count} calendar(s) from the group`,
			};
		}),
});
