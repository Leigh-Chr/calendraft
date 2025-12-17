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

	// Type for bundle data with included relations
	// We'll infer this from the actual query result
	type BundleData = {
		bundle: {
			id: string;
			token: string;
			name: string | null;
			calendars: Array<{ calendarId: string }>;
		};
		calendarIds: string[];
	};

	/**
	 * Build a map of bundles grouped by bundleId
	 */
	const buildBundlesMap = async (
		client: PrismaTransactionClient,
		calendarIds: string[],
	): Promise<Map<string, BundleData>> => {
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

		const bundlesMap = new Map<string, BundleData>();

		for (const bc of bundleCalendars) {
			if (!bundlesMap.has(bc.bundleId)) {
				bundlesMap.set(bc.bundleId, {
					bundle: bc.bundle,
					calendarIds: [],
				});
			}
			const bundleData = bundlesMap.get(bc.bundleId);
			if (bundleData) {
				bundleData.calendarIds.push(bc.calendarId);
			}
		}

		return bundlesMap;
	};

	/**
	 * Process a single bundle: delete it entirely or remove calendar links
	 */
	const processBundle = async (
		client: PrismaTransactionClient,
		bundleId: string,
		bundle: BundleData["bundle"],
		bundleCalendarIds: string[],
		calendarIds: string[],
	) => {
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
	};

	/**
	 * Handle ShareBundleCalendar cleanup
	 * Groups bundles and deletes either the entire bundle or just the calendar links
	 */
	const cleanupShareBundles = async (
		client: PrismaTransactionClient,
		calendarIds: string[],
	) => {
		const bundlesMap = await buildBundlesMap(client, calendarIds);

		for (const [
			bundleId,
			{ bundle, calendarIds: bundleCalendarIds },
		] of bundlesMap) {
			await processBundle(
				client,
				bundleId,
				bundle,
				bundleCalendarIds,
				calendarIds,
			);
		}
	};

	const cleanup = async (client: PrismaTransactionClient) => {
		// 1. Delete CalendarShareLink
		await client.calendarShareLink.deleteMany({
			where: { calendarId: { in: calendarIds } },
		});

		// 2. Handle ShareBundleCalendar and bundles
		await cleanupShareBundles(client, calendarIds);

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
