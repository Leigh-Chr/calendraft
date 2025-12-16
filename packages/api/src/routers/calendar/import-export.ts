/**
 * Calendar import/export operations
 * Extracted from calendar.ts for better maintainability
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../index";
import { parseIcsFile } from "../../lib/ics-parser";
import { logger } from "../../lib/logger";
import { handlePrismaError } from "../../lib/prisma-error-handler";
import { verifyCalendarAccess } from "../../middleware";
import { createEventFromParsed, validateFileSize } from "./helpers";

// Helper function to validate and parse ICS file
function validateAndParseIcs(fileContent: string) {
	validateFileSize(fileContent);
	const parseResult = parseIcsFile(fileContent);

	if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Unable to parse ICS file: ${parseResult.errors.join(", ")}`,
		});
	}

	return parseResult;
}

// Helper function to create calendar
async function createImportCalendar(
	name: string | undefined,
	userId: string | null,
): Promise<Awaited<ReturnType<typeof prisma.calendar.create>>> {
	try {
		return await prisma.calendar.create({
			data: {
				name: name || `Imported Calendar - ${new Date().toLocaleDateString()}`,
				userId,
			},
		});
	} catch (error) {
		handlePrismaError(error);
		throw error; // Never reached, but TypeScript needs it
	}
}

// Helper function to process event imports
async function processEventImports(
	calendarId: string,
	events: ReturnType<typeof parseIcsFile>["events"],
): Promise<{
	importedEvents: number;
	failedEvents: number;
	importErrors: string[];
}> {
	if (events.length === 0) {
		return { importedEvents: 0, failedEvents: 0, importErrors: [] };
	}

	const results = await Promise.allSettled(
		events.map((parsedEvent) => createEventFromParsed(calendarId, parsedEvent)),
	);

	let importedEvents = 0;
	let failedEvents = 0;
	const importErrors: string[] = [];

	for (const result of results) {
		if (result.status === "fulfilled") {
			importedEvents++;
		} else {
			failedEvents++;
			const error = result.reason;
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			importErrors.push(errorMessage);
		}
	}

	if (failedEvents > 0) {
		logger.warn(`Failed to import ${failedEvents} events`, {
			calendarId,
			totalEvents: events.length,
			errors: importErrors.slice(0, 10), // Limit to first 10 errors
		});
	}

	return { importedEvents, failedEvents, importErrors };
}

export const calendarImportExportRouter = router({
	importIcs: authOrAnonProcedure
		.input(
			z.object({
				fileContent: z.string(),
				name: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const parseResult = validateAndParseIcs(input.fileContent);

			const userId = ctx.session?.user?.id || ctx.anonymousId || null;
			const calendar = await createImportCalendar(input.name, userId);

			const { importedEvents, failedEvents, importErrors } =
				await processEventImports(calendar.id, parseResult.events);

			return {
				calendar,
				importedEvents,
				failedEvents,
				warnings: parseResult.errors,
				// Only include errors if there were failures
				...(failedEvents > 0 && { importErrors: importErrors.slice(0, 10) }),
			};
		}),

	exportIcs: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				/** Optional date range filter */
				dateFrom: z.string().datetime().optional(),
				dateTo: z.string().datetime().optional(),
				/** Optional categories filter (events must have at least one of these categories) */
				categories: z.array(z.string()).optional(),
				/** Optional include only future events */
				futureOnly: z.boolean().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Build event filter
			const eventWhere: {
				startDate?: { gte?: Date; lte?: Date };
				categories?: { some: { category: { in: string[] } } };
			} = {};

			// Date range filter
			if (input.dateFrom || input.dateTo || input.futureOnly) {
				eventWhere.startDate = {};
				if (input.futureOnly) {
					eventWhere.startDate.gte = new Date();
				} else if (input.dateFrom) {
					eventWhere.startDate.gte = new Date(input.dateFrom);
				}
				if (input.dateTo) {
					eventWhere.startDate.lte = new Date(input.dateTo);
				}
			}

			// Categories filter
			if (input.categories && input.categories.length > 0) {
				eventWhere.categories = {
					some: {
						category: { in: input.categories },
					},
				};
			}

			// Verify calendar access (optimized single query)
			await verifyCalendarAccess(input.id, ctx);

			// Fetch calendar with events (access already verified)
			const calendar = await prisma.calendar.findUnique({
				where: { id: input.id },
				include: {
					events:
						Object.keys(eventWhere).length > 0
							? {
									where: eventWhere,
									include: {
										attendees: true,
										alarms: true,
										categories: true,
										resources: true,
										recurrenceDates: true,
									},
								}
							: {
									include: {
										attendees: true,
										alarms: true,
										categories: true,
										resources: true,
										recurrenceDates: true,
									},
								},
				},
			});

			if (!calendar) {
				// Should not happen after verifyCalendarAccess, but TypeScript safety
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Import the generator here to avoid circular dependencies
			const { generateIcs } = await import("../../lib/ics-generator");

			// Helper function to convert event to ICS format
			const convertEventToIcsFormat = (event: (typeof calendar.events)[0]) => {
				// Convert normalized categories to comma-separated string
				const categoriesStr =
					event.categories.length > 0
						? event.categories
								.map((c: { category: string }) => c.category)
								.join(",")
						: null;

				// Convert normalized resources to comma-separated string
				const resourcesStr =
					event.resources.length > 0
						? event.resources
								.map((r: { resource: string }) => r.resource)
								.join(",")
						: null;

				// Convert normalized recurrence dates to JSON arrays
				const rdates = event.recurrenceDates
					.filter((rd: { type: string }) => rd.type === "RDATE")
					.map((rd: { date: Date }) => rd.date);
				const exdates = event.recurrenceDates
					.filter((rd: { type: string }) => rd.type === "EXDATE")
					.map((rd: { date: Date }) => rd.date);
				const rdateJson =
					rdates.length > 0
						? JSON.stringify(rdates.map((d: Date) => d.toISOString()))
						: null;
				const exdateJson =
					exdates.length > 0
						? JSON.stringify(exdates.map((d: Date) => d.toISOString()))
						: null;

				return {
					id: event.id,
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					description: event.description,
					location: event.location,
					status: event.status,
					priority: event.priority,
					categories: categoriesStr,
					url: event.url,
					class: event.class,
					comment: event.comment,
					contact: event.contact,
					resources: resourcesStr,
					sequence: event.sequence,
					transp: event.transp,
					rrule: event.rrule,
					rdate: rdateJson,
					exdate: exdateJson,
					geoLatitude: event.geoLatitude,
					geoLongitude: event.geoLongitude,
					organizerName: event.organizerName,
					organizerEmail: event.organizerEmail,
					uid: event.uid,
					dtstamp: event.dtstamp,
					created: event.created,
					lastModified: event.lastModified,
					recurrenceId: event.recurrenceId,
					relatedTo: event.relatedTo,
					color: event.color,
					attendees: event.attendees?.map(
						(a: {
							name: string | null;
							email: string;
							role: string | null;
							status: string | null;
							rsvp: boolean;
						}) => ({
							name: a.name,
							email: a.email,
							role: a.role,
							status: a.status,
							rsvp: a.rsvp,
						}),
					),
					alarms: event.alarms?.map(
						(a: {
							trigger: string;
							action: string;
							summary: string | null;
							description: string | null;
							duration: string | null;
							repeat: number | null;
						}) => ({
							trigger: a.trigger,
							action: a.action,
							summary: a.summary,
							description: a.description,
							duration: a.duration,
							repeat: a.repeat,
						}),
					),
					createdAt: event.createdAt,
					updatedAt: event.updatedAt,
				};
			};

			const icsContent = generateIcs({
				name: calendar.name,
				events: calendar.events.map(convertEventToIcsFormat),
			});

			return { icsContent, calendarName: calendar.name };
		}),
});
