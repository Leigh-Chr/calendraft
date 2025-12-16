/**
 * Cleanup utilities for orphaned anonymous calendars
 * Removes calendars from anonymous users that haven't been accessed in a while
 */

import prisma from "@calendraft/db";
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

	// Delete calendars (events are deleted automatically via CASCADE)
	// Best practice: Add error handling even for cleanup jobs
	try {
		const result = await prisma.calendar.deleteMany({
			where: {
				id: {
					in: calendarIds,
				},
			},
		});

		return result.count;
	} catch (error) {
		// Log error but don't throw - cleanup job should be resilient
		// The error will be logged by the job's try/catch
		logger.error("Failed to delete orphaned calendars", error);
		// Return 0 to indicate no calendars were deleted
		return 0;
	}
}
