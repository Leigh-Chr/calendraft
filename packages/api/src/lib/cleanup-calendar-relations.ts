/**
 * Re-export cleanupCalendarRelations from @calendraft/db
 * This file exists for backward compatibility and to provide logger integration
 */

import type { Prisma } from "@calendraft/db";
import { cleanupCalendarRelations as dbCleanupCalendarRelations } from "@calendraft/db";
import { logger } from "./logger";

type PrismaTransactionClient = Omit<
	Prisma.TransactionClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Cleanup all relations for calendars before deletion
 * Handles CalendarShareLink, ShareBundleCalendar, and CalendarGroupMember
 * Uses transaction to ensure atomicity
 *
 * @param calendarIds - Array of calendar IDs to clean up relations for
 * @param tx - Optional Prisma transaction client. If provided, uses existing transaction. Otherwise creates a new one.
 */
export async function cleanupCalendarRelations(
	calendarIds: string[],
	tx?: PrismaTransactionClient,
): Promise<void> {
	// Call the db function with logger
	await dbCleanupCalendarRelations(calendarIds, tx, logger);
}
