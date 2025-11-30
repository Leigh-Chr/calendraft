/**
 * Scheduled cleanup job for orphaned anonymous calendars
 * Runs periodically to remove calendars from anonymous users that haven't been accessed
 */

import { cleanupOrphanedAnonymousCalendars } from "@calendraft/api/lib/cleanup";
import { logger } from "../lib/logger";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DAYS_INACTIVE = 60; // Delete calendars not accessed in 60 days (updatedAt tracks both modifications and access)

/**
 * Start the cleanup job
 * Runs every 24 hours to clean up orphaned anonymous calendars
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
 */
async function runCleanup() {
	try {
		logger.info("🧹 Running cleanup for orphaned anonymous calendars...");
		const deletedCount = await cleanupOrphanedAnonymousCalendars(DAYS_INACTIVE);

		if (deletedCount > 0) {
			logger.info(
				`✅ Cleanup completed: ${deletedCount} orphaned calendar(s) deleted`,
			);
		} else {
			logger.info("✅ Cleanup completed: No orphaned calendars found");
		}
	} catch (error) {
		logger.error("❌ Cleanup job failed", error);
	}
}
