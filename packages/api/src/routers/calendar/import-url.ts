/**
 * Calendar import from URL operations
 * Extracted from calendar.ts for better maintainability
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../index";
import { findDuplicatesAgainstExisting } from "../../lib/duplicate-detection";
import { parseIcsFile } from "../../lib/ics-parser";
import { assertValidExternalUrl } from "../../lib/url-validator";
import { checkCalendarLimit, verifyCalendarAccess } from "../../middleware";
import { createEventFromParsed, validateFileSize } from "./helpers";

/**
 * Validate calendar exists and has source URL
 */
async function validateCalendarForRefresh(calendarId: string) {
	const calendar = await prisma.calendar.findUnique({
		where: { id: calendarId },
		include: { events: true },
	});

	if (!calendar) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Calendar not found",
		});
	}

	if (!calendar.sourceUrl) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "This calendar has no source URL. It cannot be refreshed.",
		});
	}

	return calendar;
}

/**
 * Get HTTP error code and message from response status
 */
function getHttpError(
	status: number,
	url: string,
): { code: string; message: string } {
	if (status === 404) {
		return {
			code: "NOT_FOUND",
			message: `Calendar URL not found (404). The calendar at ${url} is no longer available.`,
		};
	}

	if (status >= 500) {
		return {
			code: "INTERNAL_SERVER_ERROR",
			message: `Unable to retrieve calendar: ${status}`,
		};
	}

	return {
		code: "BAD_REQUEST",
		message: `Unable to retrieve calendar: ${status}`,
	};
}

/**
 * Fetch ICS content from URL with error handling
 */
async function fetchIcsContent(url: string, timeout = 60000): Promise<string> {
	try {
		const response = await fetch(url, {
			headers: {
				Accept: "text/calendar, application/calendar+xml, */*",
				"User-Agent": "Calendraft/1.0",
			},
			signal: AbortSignal.timeout(timeout),
		});

		if (!response.ok) {
			const { code, message } = getHttpError(response.status, url);
			throw new TRPCError({
				code: code as "NOT_FOUND" | "INTERNAL_SERVER_ERROR" | "BAD_REQUEST",
				message: message,
			});
		}

		return await response.text();
	} catch (error) {
		if (error instanceof TRPCError) throw error;

		if (error instanceof Error && error.name === "AbortError") {
			throw new TRPCError({
				code: "TIMEOUT",
				message:
					"Request timed out while fetching calendar. The server may be slow or unreachable.",
			});
		}

		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Error retrieving calendar: ${error instanceof Error ? error.message : "Unknown error"}`,
		});
	}
}

/**
 * Filter duplicate events from parsed events
 */
function filterDuplicateEvents(
	parsedEvents: Array<{
		uid?: string | null;
		title: string;
		startDate: Date;
		endDate: Date;
		location?: string | null;
	}>,
	existingEvents: Array<{
		id: string;
		uid?: string | null;
		title: string;
		startDate: Date;
		endDate: Date;
		location?: string | null;
	}>,
): { eventsToImport: typeof parsedEvents; skippedDuplicates: number } {
	const newEventsForCheck = parsedEvents.map((e, idx) => ({
		id: `new-${idx}`,
		uid: e.uid ?? null,
		title: e.title,
		startDate: e.startDate,
		endDate: e.endDate,
		location: e.location ?? null,
	}));

	const existingEventsForCheck = existingEvents.map((e) => ({
		id: e.id,
		uid: e.uid ?? null,
		title: e.title,
		startDate: e.startDate,
		endDate: e.endDate,
		location: e.location ?? null,
	}));

	const { unique, duplicates } = findDuplicatesAgainstExisting(
		newEventsForCheck,
		existingEventsForCheck,
		{
			useUid: true,
			useTitle: true,
			dateTolerance: 60000, // 1 minute tolerance
		},
	);

	const uniqueIndices = new Set(
		unique.map((e) => Number.parseInt(e.id.replace("new-", ""), 10)),
	);
	const eventsToImport = parsedEvents.filter((_, idx) =>
		uniqueIndices.has(idx),
	);

	return {
		eventsToImport,
		skippedDuplicates: duplicates.length,
	};
}

export const calendarImportUrlRouter = router({
	importIcsIntoCalendar: authOrAnonProcedure
		.input(
			z.object({
				calendarId: z.string(),
				fileContent: z.string(),
				removeDuplicates: z.boolean().optional().default(false),
			}),
		)
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
				// Should not happen after verifyCalendarAccess, but TypeScript safety
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			validateFileSize(input.fileContent);

			const parseResult = parseIcsFile(input.fileContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unable to parse ICS file: ${parseResult.errors.join(", ")}`,
				});
			}

			// Filter duplicates if requested using enhanced detection
			let eventsToImport = parseResult.events;
			let skippedDuplicates = 0;

			if (input.removeDuplicates) {
				// Adapt parsed events to the duplicate check interface
				const newEventsForCheck = parseResult.events.map((e, idx) => ({
					id: `new-${idx}`,
					uid: e.uid ?? null,
					title: e.title,
					startDate: e.startDate,
					endDate: e.endDate,
					location: e.location ?? null,
				}));

				const existingEventsForCheck = calendar.events.map((e) => ({
					id: e.id,
					uid: e.uid ?? null,
					title: e.title,
					startDate: e.startDate,
					endDate: e.endDate,
					location: e.location ?? null,
				}));

				const { unique, duplicates } = findDuplicatesAgainstExisting(
					newEventsForCheck,
					existingEventsForCheck,
					{
						useUid: true,
						useTitle: true,
						dateTolerance: 60000, // 1 minute tolerance
					},
				);

				// Map back to original events
				const uniqueIndices = new Set(
					unique.map((e) => Number.parseInt(e.id.replace("new-", ""), 10)),
				);
				eventsToImport = parseResult.events.filter((_, idx) =>
					uniqueIndices.has(idx),
				);
				skippedDuplicates = duplicates.length;
			}

			// Create events
			if (eventsToImport.length > 0) {
				for (const parsedEvent of eventsToImport) {
					await createEventFromParsed(input.calendarId, parsedEvent);
				}
			}

			return {
				importedEvents: eventsToImport.length,
				skippedDuplicates,
				warnings: parseResult.errors,
			};
		}),

	/**
	 * Import a calendar from a URL
	 * Creates a new calendar with the sourceUrl stored for future refresh
	 */
	importFromUrl: authOrAnonProcedure
		.input(
			z.object({
				url: z.string().url("Invalid URL"),
				name: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await checkCalendarLimit(ctx);

			// Validate URL against SSRF attacks
			assertValidExternalUrl(input.url);

			// Fetch the ICS content from the URL
			let icsContent: string;
			try {
				const response = await fetch(input.url, {
					headers: {
						Accept: "text/calendar, application/calendar+xml, */*",
						"User-Agent": "Calendraft/1.0",
					},
					signal: AbortSignal.timeout(30000), // 30 second timeout
				});

				if (!response.ok) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Unable to retrieve calendar: ${response.status} ${response.statusText}`,
					});
				}

				icsContent = await response.text();
			} catch (error) {
				if (error instanceof TRPCError) throw error;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Error retrieving calendar: ${error instanceof Error ? error.message : "Unknown error"}`,
				});
			}

			validateFileSize(icsContent);
			const parseResult = parseIcsFile(icsContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unable to parse ICS file: ${parseResult.errors.join(", ")}`,
				});
			}

			// Create calendar with sourceUrl
			const calendar = await prisma.calendar.create({
				data: {
					name:
						input.name ||
						`Imported Calendar - ${new Date().toLocaleDateString("en-US")}`,
					userId: ctx.session?.user?.id || ctx.anonymousId || null,
					sourceUrl: input.url,
					lastSyncedAt: new Date(),
				},
			});

			// Create events
			if (parseResult.events.length > 0) {
				for (const parsedEvent of parseResult.events) {
					await createEventFromParsed(calendar.id, parsedEvent);
				}
			}

			return {
				calendar,
				importedEvents: parseResult.events.length,
				warnings: parseResult.errors,
			};
		}),

	/**
	 * Refresh a calendar from its source URL
	 * Simple manual refresh: fetch, parse, and import events
	 */
	refreshFromUrl: authOrAnonProcedure
		.input(
			z.object({
				calendarId: z.string(),
				/** If true, removes all existing events before importing */
				replaceAll: z.boolean().default(false),
				/** If true, skips events that already exist (based on UID or title+dates) */
				skipDuplicates: z.boolean().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify calendar access
			await verifyCalendarAccess(input.calendarId, ctx);

			// Validate calendar exists and has source URL
			const calendar = await validateCalendarForRefresh(input.calendarId);

			// Validate URL against SSRF attacks
			assertValidExternalUrl(calendar.sourceUrl!);

			// If replaceAll, delete all events first
			let deletedCount = 0;
			if (input.replaceAll) {
				const deleteResult = await prisma.event.deleteMany({
					where: { calendarId: input.calendarId },
				});
				deletedCount = deleteResult.count;
			}

			// Fetch and parse ICS content
			const icsContent = await fetchIcsContent(calendar.sourceUrl!);
			validateFileSize(icsContent);
			const parseResult = parseIcsFile(icsContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Unable to parse ICS file: ${parseResult.errors.join(", ")}`,
				});
			}

			// Filter duplicates if requested
			let eventsToImport = parseResult.events;
			let skippedDuplicates = 0;

			if (input.skipDuplicates && !input.replaceAll) {
				const result = filterDuplicateEvents(
					parseResult.events,
					calendar.events,
				);
				eventsToImport = result.eventsToImport;
				skippedDuplicates = result.skippedDuplicates;
			}

			// Create events
			if (eventsToImport.length > 0) {
				for (const parsedEvent of eventsToImport) {
					await createEventFromParsed(input.calendarId, parsedEvent);
				}
			}

			// Update lastSyncedAt
			await prisma.calendar.update({
				where: { id: input.calendarId },
				data: {
					lastSyncedAt: new Date(),
				},
			});

			return {
				importedEvents: eventsToImport.length,
				deletedEvents: deletedCount,
				skippedDuplicates,
				warnings: parseResult.errors,
			};
		}),
});
