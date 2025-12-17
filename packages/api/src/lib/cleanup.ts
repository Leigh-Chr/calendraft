/**
 * Cleanup utilities for orphaned anonymous calendars
 * Removes calendars from anonymous users that haven't been accessed in a while
 */

import prisma from "@calendraft/db";
import { cleanupCalendarRelations } from "./cleanup-calendar-relations";
import { logger } from "./logger";

/**
 * Delete anonymous calendars that haven't been accessed in the last N days
 * Uses updatedAt which is updated on both modifications AND access (getById/list)
 * @param daysInactive - Number of days of inactivity before deletion (default: 60)
 * @returns Number of deleted calendars
 */
export async function cleanupOrphanedAnonymousCalendars(
	daysInactive = 60,
): Promise<number> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

	// Find anonymous calendars (userId starts with "anon-") that haven't been accessed
	// updatedAt is updated on both modifications and access (via getById/list)
	const orphanedCalendars = await prisma.calendar.findMany({
		where: {
			userId: {
				startsWith: "anon-",
			},
			updatedAt: {
				lt: cutoffDate,
			},
		},
		select: {
			id: true,
		},
	});

	if (orphanedCalendars.length === 0) {
		return 0;
	}

	const calendarIds = orphanedCalendars.map((cal) => cal.id);

	// Use transaction to ensure atomicity of cleanup and deletion
	// Best practice: Add error handling even for cleanup jobs
	try {
		const result = await prisma.$transaction(async (tx) => {
			// Cleanup all relations (CalendarShareLink, ShareBundleCalendar, CalendarGroupMember)
			await cleanupCalendarRelations(calendarIds, tx);
			// Delete calendars (Events will be deleted via CASCADE)
			return await tx.calendar.deleteMany({
				where: {
					id: {
						in: calendarIds,
					},
				},
			});
		});

		logger.info("Successfully cleaned up orphaned anonymous calendars", {
			deletedCount: result.count,
			calendarIds: calendarIds.length,
		});

		return result.count;
	} catch (error) {
		// Log error with details but don't throw - cleanup job should be resilient
		// The error will be logged by the job's try/catch
		logger.error("Failed to delete orphaned calendars", {
			error,
			calendarIdsCount: calendarIds.length,
			calendarIds: calendarIds.slice(0, 10), // Log first 10 IDs for debugging
		});
		// Return 0 to indicate no calendars were deleted
		return 0;
	}
}
