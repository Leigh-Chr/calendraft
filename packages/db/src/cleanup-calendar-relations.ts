/**
 * Cleanup utilities for calendar relations before deletion
 * Handles CalendarShareLink, ShareBundleCalendar, and CalendarGroupMember
 * These relations don't have Prisma foreign keys, so they must be cleaned up manually
 */

import type { Prisma } from "./index";
import prisma from "./index";

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
 * @param logger - Optional logger function for logging operations. If not provided, no logging is performed.
 */
export async function cleanupCalendarRelations(
	calendarIds: string[],
	tx?: PrismaTransactionClient,
	logger?: {
		info: (message: string, data?: unknown) => void;
	},
): Promise<void> {
	if (calendarIds.length === 0) {
		return;
	}

	const cleanup = async (client: PrismaTransactionClient) => {
		// 1. Delete CalendarShareLink
		await client.calendarShareLink.deleteMany({
			where: { calendarId: { in: calendarIds } },
		});

		// 2. Handle ShareBundleCalendar and bundles
		// First, find all bundles containing the calendars to be deleted
		const bundleCalendars = await client.shareBundleCalendar.findMany({
			where: { calendarId: { in: calendarIds } },
			include: {
				bundle: {
					include: {
						calendars: true,
					},
				},
			},
		});

		// Group by bundleId to process each bundle once
		const bundlesMap = new Map<
			string,
			{
				bundle: (typeof bundleCalendars)[0]["bundle"];
				calendarIds: string[];
			}
		>();

		for (const bc of bundleCalendars) {
			if (!bundlesMap.has(bc.bundleId)) {
				bundlesMap.set(bc.bundleId, {
					bundle: bc.bundle,
					calendarIds: [],
				});
			}
			bundlesMap.get(bc.bundleId)!.calendarIds.push(bc.calendarId);
		}

		// Delete bundles or links based on remaining calendars
		for (const [
			bundleId,
			{ bundle, calendarIds: bundleCalendarIds },
		] of bundlesMap) {
			const allCalendarIds = bundle.calendars.map((c) => c.calendarId);
			const remainingCalendars = allCalendarIds.filter(
				(id) => !calendarIds.includes(id),
			);

			if (remainingCalendars.length === 0) {
				// All calendars in bundle are being deleted → delete entire bundle
				// ShareBundleCalendar will be deleted via CASCADE
				await client.calendarShareBundle.delete({
					where: { id: bundleId },
				});
				if (logger) {
					logger.info("Deleted share bundle (all calendars deleted)", {
						bundleId,
					});
				}
			} else {
				// Some calendars remain → delete only the ShareBundleCalendar links
				await client.shareBundleCalendar.deleteMany({
					where: {
						bundleId,
						calendarId: { in: bundleCalendarIds },
					},
				});
				if (logger) {
					logger.info("Removed calendars from share bundle (bundle kept)", {
						bundleId,
						removedCount: bundleCalendarIds.length,
					});
				}
			}
		}

		// 3. Delete CalendarGroupMember
		await client.calendarGroupMember.deleteMany({
			where: { calendarId: { in: calendarIds } },
		});
	};

	// If transaction client is provided, use it directly
	// Otherwise, create a new transaction
	if (tx) {
		await cleanup(tx);
	} else {
		await prisma.$transaction(async (transactionClient) => {
			await cleanup(transactionClient);
		});
	}
}
