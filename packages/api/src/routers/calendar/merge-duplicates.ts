/**
 * Calendar merge and duplicate cleaning operations
 * Extracted from calendar.ts for better maintainability
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../index";
import {
	deduplicateEvents,
	getDuplicateIds,
} from "../../lib/duplicate-detection";
import { buildOwnershipFilter, verifyCalendarAccess } from "../../middleware";

export const calendarMergeDuplicatesRouter = router({
	merge: authOrAnonProcedure
		.input(
			z.object({
				calendarIds: z.array(z.string()).min(2),
				name: z.string().min(1),
				removeDuplicates: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Fetch all calendars
			const calendars = await prisma.calendar.findMany({
				where: {
					id: { in: input.calendarIds },
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: true,
				},
			});

			if (calendars.length !== input.calendarIds.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "One or more calendars not found",
				});
			}

			// Collect all events
			const allEvents = calendars.flatMap((cal) => cal.events);

			// Remove duplicates if requested using enhanced detection
			let eventsToMerge = allEvents;
			if (input.removeDuplicates) {
				const { unique } = deduplicateEvents(allEvents, {
					useUid: true,
					useTitle: true,
					dateTolerance: 60000, // 1 minute tolerance
				});
				eventsToMerge = unique;
			}

			// Create merged calendar
			const mergedCalendar = await prisma.calendar.create({
				data: {
					name: input.name,
					userId: ctx.session?.user?.id || ctx.anonymousId || null,
				},
			});

			// Create all events
			if (eventsToMerge.length > 0) {
				await prisma.event.createMany({
					data: eventsToMerge.map((event) => ({
						calendarId: mergedCalendar.id,
						title: event.title,
						startDate: event.startDate,
						endDate: event.endDate,
						description: event.description,
						location: event.location,
					})),
				});
			}

			return {
				calendar: mergedCalendar,
				mergedEvents: eventsToMerge.length,
				removedDuplicates: allEvents.length - eventsToMerge.length,
			};
		}),

	cleanDuplicates: authOrAnonProcedure
		.input(z.object({ calendarId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify calendar access (optimized single query)
			await verifyCalendarAccess(input.calendarId, ctx);

			// Fetch calendar with events (access already verified)
			const calendar = await prisma.calendar.findUnique({
				where: { id: input.calendarId },
				include: {
					events: true,
				},
			});

			if (!calendar) {
				// Calendar exists but user doesn't have access
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied to this calendar",
				});
			}

			// Detect duplicates using enhanced detection
			const duplicateIds = getDuplicateIds(calendar.events, {
				useUid: true,
				useTitle: true,
				dateTolerance: 60000, // 1 minute tolerance
			});

			// Delete duplicates
			if (duplicateIds.length > 0) {
				await prisma.event.deleteMany({
					where: {
						id: { in: duplicateIds },
					},
				});
			}

			return {
				removedCount: duplicateIds.length,
				remainingEvents: calendar.events.length - duplicateIds.length,
			};
		}),
});
