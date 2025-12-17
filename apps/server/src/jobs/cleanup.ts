/**
 * Scheduled cleanup job for various expired and orphaned data
 * Runs periodically to remove temporary and time-sensitive records
 */

import {
	cleanupExpiredSessions,
	cleanupExpiredShareBundles,
	cleanupExpiredShareLinks,
	cleanupExpiredVerifications,
	cleanupInactiveShareBundles,
	cleanupInactiveShareLinks,
	cleanupOrphanedAnonymousCalendars,
	cleanupPendingGroupInvitations,
} from "@calendraft/api/lib/cleanup";
import { logger } from "../lib/logger";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Configuration for cleanup operations
const DAYS_INACTIVE_CALENDARS = 60; // Delete anonymous calendars not accessed in 60 days
const GRACE_PERIOD_EXPIRED_SHARES = 7; // Days to wait after expiration before deleting shares
const DAYS_INACTIVE_SHARES = 90; // Days of inactivity for disabled shares
const DAYS_INACTIVE_ACTIVE_SHARES = 365; // Days of inactivity for active shares without expiration
const DAYS_PENDING_INVITATIONS = 30; // Days after which pending group invitations are deleted

/**
 * Start the cleanup job
 * Runs every 24 hours to clean up expired and orphaned data
 */
export function startCleanupJob() {
	logger.info("🧹 Cleanup job started (runs every 24 hours)");

	// Run immediately on startup (optional, can be removed if you prefer to wait)
	runCleanup();

	// Schedule periodic cleanup
	setInterval(() => {
		runCleanup();
	}, CLEANUP_INTERVAL_MS);
}

/**
 * Run the cleanup process
 * Executes cleanup operations in order of priority:
 * 1. High priority (security): expired sessions, expired verifications
 * 2. Medium priority (regular cleanup): expired shares, pending invitations
 * 3. Low priority (optimization): inactive shares, orphaned calendars
 */
async function runCleanup() {
	const startTime = Date.now();
	logger.info("🧹 Running cleanup job...");

	const results = {
		expiredSessions: 0,
		expiredVerifications: 0,
		expiredShareLinks: 0,
		expiredShareBundles: 0,
		pendingInvitations: 0,
		inactiveShareLinks: 0,
		inactiveShareBundles: 0,
		orphanedCalendars: 0,
	};

	try {
		// High priority: Security-related cleanup
		logger.info("🔒 Running high-priority cleanup (security)...");
		results.expiredSessions = await cleanupExpiredSessions();
		results.expiredVerifications = await cleanupExpiredVerifications();

		// Medium priority: Regular cleanup
		logger.info(
			"🧹 Running medium-priority cleanup (expired shares, invitations)...",
		);
		results.expiredShareLinks = await cleanupExpiredShareLinks(
			GRACE_PERIOD_EXPIRED_SHARES,
		);
		results.expiredShareBundles = await cleanupExpiredShareBundles(
			GRACE_PERIOD_EXPIRED_SHARES,
		);
		results.pendingInvitations = await cleanupPendingGroupInvitations(
			DAYS_PENDING_INVITATIONS,
		);

		// Low priority: Optimization cleanup
		logger.info(
			"⚡ Running low-priority cleanup (inactive shares, orphaned calendars)...",
		);
		results.inactiveShareLinks = await cleanupInactiveShareLinks(
			DAYS_INACTIVE_SHARES,
			DAYS_INACTIVE_ACTIVE_SHARES,
		);
		results.inactiveShareBundles = await cleanupInactiveShareBundles(
			DAYS_INACTIVE_SHARES,
			DAYS_INACTIVE_ACTIVE_SHARES,
		);
		results.orphanedCalendars = await cleanupOrphanedAnonymousCalendars(
			DAYS_INACTIVE_CALENDARS,
		);

		const totalDeleted =
			results.expiredSessions +
			results.expiredVerifications +
			results.expiredShareLinks +
			results.expiredShareBundles +
			results.pendingInvitations +
			results.inactiveShareLinks +
			results.inactiveShareBundles +
			results.orphanedCalendars;

		const duration = Date.now() - startTime;

		if (totalDeleted > 0) {
			logger.info("✅ Cleanup job completed", {
				duration: `${duration}ms`,
				totalDeleted,
				details: results,
			});
		} else {
			logger.info("✅ Cleanup job completed: No data to clean up", {
				duration: `${duration}ms`,
			});
		}
	} catch (error) {
		logger.error("❌ Cleanup job failed", {
			error,
			partialResults: results,
		});
	}
}
