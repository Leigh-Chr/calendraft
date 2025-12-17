/**
 * Cleanup utilities for various expired and orphaned data
 * Handles automatic deletion of temporary and time-sensitive records
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

/**
 * Delete expired sessions
 * Sessions are automatically invalid after expiration, but we clean them up for database hygiene
 * @returns Number of deleted sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
	const now = new Date();

	try {
		const result = await prisma.session.deleteMany({
			where: {
				expiresAt: {
					lt: now,
				},
			},
		});

		if (result.count > 0) {
			logger.info("Cleaned up expired sessions", {
				deletedCount: result.count,
			});
		}

		return result.count;
	} catch (error) {
		logger.error("Failed to delete expired sessions", {
			error,
		});
		return 0;
	}
}

/**
 * Delete expired verification tokens
 * These are used for email verification and password reset
 * @returns Number of deleted verifications
 */
export async function cleanupExpiredVerifications(): Promise<number> {
	const now = new Date();

	try {
		const result = await prisma.verification.deleteMany({
			where: {
				expiresAt: {
					lt: now,
				},
			},
		});

		if (result.count > 0) {
			logger.info("Cleaned up expired verifications", {
				deletedCount: result.count,
			});
		}

		return result.count;
	} catch (error) {
		logger.error("Failed to delete expired verifications", {
			error,
		});
		return 0;
	}
}

/**
 * Delete expired share links
 * Links with expiresAt that have passed are deleted after a grace period
 * @param gracePeriodDays - Days to wait after expiration before deletion (default: 7)
 * @returns Number of deleted share links
 */
export async function cleanupExpiredShareLinks(
	gracePeriodDays = 7,
): Promise<number> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

	try {
		const result = await prisma.calendarShareLink.deleteMany({
			where: {
				expiresAt: {
					not: null,
					lt: cutoffDate,
				},
			},
		});

		if (result.count > 0) {
			logger.info("Cleaned up expired share links", {
				deletedCount: result.count,
				gracePeriodDays,
			});
		}

		return result.count;
	} catch (error) {
		logger.error("Failed to delete expired share links", {
			error,
		});
		return 0;
	}
}

/**
 * Delete expired share bundles
 * Bundles with expiresAt that have passed are deleted after a grace period
 * @param gracePeriodDays - Days to wait after expiration before deletion (default: 7)
 * @returns Number of deleted share bundles
 */
export async function cleanupExpiredShareBundles(
	gracePeriodDays = 7,
): Promise<number> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

	try {
		const result = await prisma.calendarShareBundle.deleteMany({
			where: {
				expiresAt: {
					not: null,
					lt: cutoffDate,
				},
			},
		});

		if (result.count > 0) {
			logger.info("Cleaned up expired share bundles", {
				deletedCount: result.count,
				gracePeriodDays,
			});
		}

		return result.count;
	} catch (error) {
		logger.error("Failed to delete expired share bundles", {
			error,
		});
		return 0;
	}
}

/**
 * Delete inactive share links that haven't been accessed in a long time
 * - Inactive links (isActive=false): 90 days since last access (or creation if never accessed)
 * - Active links without expiration: 365 days since last access (or creation if never accessed)
 * @param inactiveDays - Days of inactivity for disabled links (default: 90)
 * @param activeDays - Days of inactivity for active links without expiration (default: 365)
 * @returns Number of deleted share links
 */
export async function cleanupInactiveShareLinks(
	inactiveDays = 90,
	activeDays = 365,
): Promise<number> {
	const inactiveCutoff = new Date();
	inactiveCutoff.setDate(inactiveCutoff.getDate() - inactiveDays);

	const activeCutoff = new Date();
	activeCutoff.setDate(activeCutoff.getDate() - activeDays);

	try {
		// Delete inactive links not accessed in inactiveDays
		// Use lastAccessedAt if available, otherwise use createdAt
		const inactiveResult = await prisma.calendarShareLink.deleteMany({
			where: {
				isActive: false,
				OR: [
					{
						lastAccessedAt: {
							not: null,
							lt: inactiveCutoff,
						},
					},
					{
						lastAccessedAt: null,
						createdAt: {
							lt: inactiveCutoff,
						},
					},
				],
			},
		});

		// Delete active links without expiration not accessed in activeDays
		// Use lastAccessedAt if available, otherwise use createdAt
		const activeResult = await prisma.calendarShareLink.deleteMany({
			where: {
				isActive: true,
				expiresAt: null,
				OR: [
					{
						lastAccessedAt: {
							not: null,
							lt: activeCutoff,
						},
					},
					{
						lastAccessedAt: null,
						createdAt: {
							lt: activeCutoff,
						},
					},
				],
			},
		});

		const totalCount = inactiveResult.count + activeResult.count;

		if (totalCount > 0) {
			logger.info("Cleaned up inactive share links", {
				deletedCount: totalCount,
				inactiveCount: inactiveResult.count,
				activeCount: activeResult.count,
				inactiveDays,
				activeDays,
			});
		}

		return totalCount;
	} catch (error) {
		logger.error("Failed to delete inactive share links", {
			error,
		});
		return 0;
	}
}

/**
 * Delete inactive share bundles that haven't been accessed in a long time
 * - Inactive bundles (isActive=false): 90 days since last access (or creation if never accessed)
 * - Active bundles without expiration: 365 days since last access (or creation if never accessed)
 * @param inactiveDays - Days of inactivity for disabled bundles (default: 90)
 * @param activeDays - Days of inactivity for active bundles without expiration (default: 365)
 * @returns Number of deleted share bundles
 */
export async function cleanupInactiveShareBundles(
	inactiveDays = 90,
	activeDays = 365,
): Promise<number> {
	const inactiveCutoff = new Date();
	inactiveCutoff.setDate(inactiveCutoff.getDate() - inactiveDays);

	const activeCutoff = new Date();
	activeCutoff.setDate(activeCutoff.getDate() - activeDays);

	try {
		// Delete inactive bundles not accessed in inactiveDays
		// Use lastAccessedAt if available, otherwise use createdAt
		const inactiveResult = await prisma.calendarShareBundle.deleteMany({
			where: {
				isActive: false,
				OR: [
					{
						lastAccessedAt: {
							not: null,
							lt: inactiveCutoff,
						},
					},
					{
						lastAccessedAt: null,
						createdAt: {
							lt: inactiveCutoff,
						},
					},
				],
			},
		});

		// Delete active bundles without expiration not accessed in activeDays
		// Use lastAccessedAt if available, otherwise use createdAt
		const activeResult = await prisma.calendarShareBundle.deleteMany({
			where: {
				isActive: true,
				expiresAt: null,
				OR: [
					{
						lastAccessedAt: {
							not: null,
							lt: activeCutoff,
						},
					},
					{
						lastAccessedAt: null,
						createdAt: {
							lt: activeCutoff,
						},
					},
				],
			},
		});

		const totalCount = inactiveResult.count + activeResult.count;

		if (totalCount > 0) {
			logger.info("Cleaned up inactive share bundles", {
				deletedCount: totalCount,
				inactiveCount: inactiveResult.count,
				activeCount: activeResult.count,
				inactiveDays,
				activeDays,
			});
		}

		return totalCount;
	} catch (error) {
		logger.error("Failed to delete inactive share bundles", {
			error,
		});
		return 0;
	}
}

/**
 * Delete pending group invitations that haven't been accepted
 * Invitations pending for more than the specified days are considered abandoned
 * @param daysPending - Days after which pending invitations are deleted (default: 30)
 * @returns Number of deleted group member invitations
 */
export async function cleanupPendingGroupInvitations(
	daysPending = 30,
): Promise<number> {
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - daysPending);

	try {
		const result = await prisma.groupMember.deleteMany({
			where: {
				acceptedAt: null,
				invitedAt: {
					lt: cutoffDate,
				},
			},
		});

		if (result.count > 0) {
			logger.info("Cleaned up pending group invitations", {
				deletedCount: result.count,
				daysPending,
			});
		}

		return result.count;
	} catch (error) {
		logger.error("Failed to delete pending group invitations", {
			error,
		});
		return 0;
	}
}
