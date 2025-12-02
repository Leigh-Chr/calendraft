import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../index";
import {
	deduplicateEvents,
	findDuplicatesAgainstExisting,
	getDuplicateIds,
} from "../lib/duplicate-detection";
import {
	parseAlarmAction,
	parseAttendeeRole,
	parseAttendeeStatus,
	parseEventClass,
	parseEventStatus,
	parseEventTransparency,
	prepareCategoriesData,
	prepareRecurrenceDatesData,
	prepareResourcesData,
} from "../lib/event-helpers";
import type { ParsedEvent } from "../lib/ics-parser";
import { parseIcsFile } from "../lib/ics-parser";
import {
	buildOwnershipFilter,
	checkAnonymousCalendarLimit,
	getAnonymousUsage,
} from "../middleware";

/**
 * Validate ICS file size
 */
function validateFileSize(fileContent: string) {
	const maxSizeBytes = 5 * 1024 * 1024; // 5MB
	const fileSizeBytes = new Blob([fileContent]).size;
	if (fileSizeBytes > maxSizeBytes) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Fichier trop volumineux. Taille maximale autorisée : 5MB. Taille actuelle : ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`,
		});
	}
}

/**
 * Convert parsed attendees to Prisma create format
 */
function convertAttendeesForCreate(
	attendees?: Array<{
		name?: string;
		email: string;
		role?: string;
		status?: string;
		rsvp?: boolean;
	}>,
) {
	if (!attendees) return undefined;

	return {
		create: attendees.map((a) => ({
			name: a.name || null,
			email: a.email,
			role: parseAttendeeRole(a.role),
			status: parseAttendeeStatus(a.status),
			rsvp: a.rsvp ?? false,
		})),
	};
}

/**
 * Convert parsed alarms to Prisma create format
 */
function convertAlarmsForCreate(
	alarms?: Array<{
		trigger: string;
		action: string;
		summary?: string;
		description?: string;
		duration?: string;
		repeat?: number;
	}>,
) {
	if (!alarms) return undefined;

	return {
		create: alarms.map((a) => {
			const action = parseAlarmAction(a.action);
			if (!action) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid alarm action: ${a.action}`,
				});
			}
			return {
				trigger: a.trigger,
				action: action,
				summary: a.summary || null,
				description: a.description || null,
				duration: a.duration || null,
				repeat: a.repeat ?? null,
			};
		}),
	};
}

/**
 * Helper to convert string or undefined to string or null
 */
function toStringOrNull(value: string | undefined): string | null {
	return value || null;
}

/**
 * Helper to convert number or undefined to number or null
 */
function toNumberOrNull(value: number | undefined): number | null {
	return value ?? null;
}

/**
 * Extract basic metadata fields from parsed event
 */
function extractBasicMetadata(parsedEvent: ParsedEvent) {
	return {
		description: toStringOrNull(parsedEvent.description),
		location: toStringOrNull(parsedEvent.location),
		url: toStringOrNull(parsedEvent.url),
		comment: toStringOrNull(parsedEvent.comment),
		contact: toStringOrNull(parsedEvent.contact),
		rrule: toStringOrNull(parsedEvent.rrule),
		color: toStringOrNull(parsedEvent.color),
	};
}

/**
 * Extract organizer fields from parsed event
 */
function extractOrganizerFields(parsedEvent: ParsedEvent) {
	return {
		organizerName: toStringOrNull(parsedEvent.organizerName),
		organizerEmail: toStringOrNull(parsedEvent.organizerEmail),
	};
}

/**
 * Prepare event data from parsed ICS event
 */
function prepareEventDataFromParsed(
	calendarId: string,
	parsedEvent: ParsedEvent,
) {
	return {
		calendarId,
		title: parsedEvent.title,
		startDate: parsedEvent.startDate,
		endDate: parsedEvent.endDate,
		...extractBasicMetadata(parsedEvent),
		status: parseEventStatus(parsedEvent.status),
		priority: toNumberOrNull(parsedEvent.priority),
		class: parseEventClass(parsedEvent.class),
		sequence: parsedEvent.sequence ?? 0,
		transp: parseEventTransparency(parsedEvent.transp),
		geoLatitude: toNumberOrNull(parsedEvent.geoLatitude),
		geoLongitude: toNumberOrNull(parsedEvent.geoLongitude),
		...extractOrganizerFields(parsedEvent),
		uid: toStringOrNull(parsedEvent.uid),
		dtstamp: parsedEvent.dtstamp || new Date(),
		created: parsedEvent.created || null,
		lastModified: parsedEvent.lastModified || null,
		recurrenceId: toStringOrNull(parsedEvent.recurrenceId),
		relatedTo: toStringOrNull(parsedEvent.relatedTo),
		categories: prepareCategoriesData(parsedEvent.categories),
		resources: prepareResourcesData(parsedEvent.resources),
		recurrenceDates: prepareRecurrenceDatesData(
			parsedEvent.rdate,
			parsedEvent.exdate,
		),
		attendees: convertAttendeesForCreate(parsedEvent.attendees),
		alarms: convertAlarmsForCreate(parsedEvent.alarms),
	};
}

/**
 * Create event from parsed ICS data
 */
async function createEventFromParsed(
	calendarId: string,
	parsedEvent: ParsedEvent,
) {
	const eventData = prepareEventDataFromParsed(calendarId, parsedEvent);
	return await prisma.event.create({ data: eventData });
}

export const calendarRouter = router({
	list: authOrAnonProcedure.query(async ({ ctx }) => {
		const calendars = await prisma.calendar.findMany({
			where: buildOwnershipFilter(ctx),
			include: {
				_count: {
					select: { events: true },
				},
			},
			orderBy: {
				updatedAt: "desc",
			},
		});

		// Update updatedAt for all calendars on list access (for anonymous users only)
		// This prevents cleanup of calendars that are still being accessed
		// Only do this for anonymous users to avoid unnecessary DB writes for authenticated users
		if (ctx.anonymousId && calendars.length > 0) {
			const calendarIds = calendars.map((cal) => cal.id);
			await prisma.calendar.updateMany({
				where: {
					id: { in: calendarIds },
					userId: ctx.anonymousId,
				},
				data: { updatedAt: new Date() },
			});
		}

		return calendars.map((cal) => ({
			id: cal.id,
			name: cal.name,
			color: cal.color,
			eventCount: cal._count.events,
			sourceUrl: cal.sourceUrl,
			lastSyncedAt: cal.lastSyncedAt,
			createdAt: cal.createdAt,
			updatedAt: cal.updatedAt,
		}));
	}),

	getById: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: {
						orderBy: {
							startDate: "asc",
						},
					},
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			// Update updatedAt on access to prevent cleanup of actively used calendars
			// This ensures that calendars that are viewed (even if not modified) are not considered orphaned
			await prisma.calendar.update({
				where: { id: input.id },
				data: { updatedAt: new Date() },
			});

			return calendar;
		}),

	create: authOrAnonProcedure
		.input(
			z.object({
				name: z
					.string()
					.trim()
					.min(1)
					.max(200)
					.transform((val) => val.trim()), // Max length validation with auto-trimming
				color: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Couleur invalide (format: #RRGGBB)")
					.optional()
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await checkAnonymousCalendarLimit(ctx);

			const calendar = await prisma.calendar.create({
				data: {
					name: input.name, // Already trimmed by Zod transform
					color: input.color || null,
					userId: ctx.session?.user?.id || ctx.anonymousId || null,
				},
			});

			return calendar;
		}),

	update: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				name: z
					.string()
					.trim()
					.min(1)
					.max(200)
					.transform((val) => val.trim())
					.optional(), // Now optional for partial updates
				color: z
					.string()
					.regex(/^#[0-9A-Fa-f]{6}$/, "Couleur invalide (format: #RRGGBB)")
					.optional()
					.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			const updateData: { name?: string; color?: string | null } = {};
			if (input.name !== undefined) {
				updateData.name = input.name;
			}
			if (input.color !== undefined) {
				updateData.color = input.color;
			}

			return await prisma.calendar.update({
				where: { id: input.id },
				data: updateData,
			});
		}),

	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			await prisma.calendar.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	importIcs: authOrAnonProcedure
		.input(
			z.object({
				fileContent: z.string(),
				name: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			validateFileSize(input.fileContent);

			const parseResult = parseIcsFile(input.fileContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Impossible de parser le fichier ICS : ${parseResult.errors.join(", ")}`,
				});
			}

			// Create calendar
			const calendar = await prisma.calendar.create({
				data: {
					name:
						input.name ||
						`Imported Calendar - ${new Date().toLocaleDateString()}`,
					userId: ctx.session?.user?.id || ctx.anonymousId || null,
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

			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: {
						where: Object.keys(eventWhere).length > 0 ? eventWhere : undefined,
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
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			// Import the generator here to avoid circular dependencies
			const { generateIcs } = await import("../lib/ics-generator");

			// Helper function to convert event to ICS format
			const convertEventToIcsFormat = (event: (typeof calendar.events)[0]) => {
				// Convert normalized categories to comma-separated string
				const categoriesStr =
					event.categories.length > 0
						? event.categories.map((c) => c.category).join(",")
						: null;

				// Convert normalized resources to comma-separated string
				const resourcesStr =
					event.resources.length > 0
						? event.resources.map((r) => r.resource).join(",")
						: null;

				// Convert normalized recurrence dates to JSON arrays
				const rdates = event.recurrenceDates
					.filter((rd) => rd.type === "RDATE")
					.map((rd) => rd.date);
				const exdates = event.recurrenceDates
					.filter((rd) => rd.type === "EXDATE")
					.map((rd) => rd.date);
				const rdateJson =
					rdates.length > 0
						? JSON.stringify(rdates.map((d) => d.toISOString()))
						: null;
				const exdateJson =
					exdates.length > 0
						? JSON.stringify(exdates.map((d) => d.toISOString()))
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
					attendees: event.attendees?.map((a) => ({
						name: a.name,
						email: a.email,
						role: a.role,
						status: a.status,
						rsvp: a.rsvp,
					})),
					alarms: event.alarms?.map((a) => ({
						trigger: a.trigger,
						action: a.action,
						summary: a.summary,
						description: a.description,
						duration: a.duration,
						repeat: a.repeat,
					})),
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

	merge: authOrAnonProcedure
		.input(
			z.object({
				calendarIds: z.array(z.string()).min(2),
				name: z.string().min(1),
				removeDuplicates: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Fetch all calendars
			const calendars = await prisma.calendar.findMany({
				where: {
					id: { in: input.calendarIds },
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: true,
				},
			});

			if (calendars.length !== input.calendarIds.length) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Un ou plusieurs calendriers non trouvés",
				});
			}

			// Collect all events
			const allEvents = calendars.flatMap((cal) => cal.events);

			// Remove duplicates if requested using enhanced detection
			let eventsToMerge = allEvents;
			if (input.removeDuplicates) {
				const { unique } = deduplicateEvents(allEvents, {
					useUid: true,
					useTitle: true,
					dateTolerance: 60000, // 1 minute tolerance
				});
				eventsToMerge = unique;
			}

			// Create merged calendar
			const mergedCalendar = await prisma.calendar.create({
				data: {
					name: input.name,
					userId: ctx.session?.user?.id || ctx.anonymousId || null,
				},
			});

			// Create all events
			if (eventsToMerge.length > 0) {
				await prisma.event.createMany({
					data: eventsToMerge.map((event) => ({
						calendarId: mergedCalendar.id,
						title: event.title,
						startDate: event.startDate,
						endDate: event.endDate,
						description: event.description,
						location: event.location,
					})),
				});
			}

			return {
				calendar: mergedCalendar,
				mergedEvents: eventsToMerge.length,
				removedDuplicates: allEvents.length - eventsToMerge.length,
			};
		}),

	cleanDuplicates: authOrAnonProcedure
		.input(z.object({ calendarId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify calendar ownership
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: true,
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			// Detect duplicates using enhanced detection
			const duplicateIds = getDuplicateIds(calendar.events, {
				useUid: true,
				useTitle: true,
				dateTolerance: 60000, // 1 minute tolerance
			});

			// Delete duplicates
			if (duplicateIds.length > 0) {
				await prisma.event.deleteMany({
					where: {
						id: { in: duplicateIds },
					},
				});
			}

			return {
				removedCount: duplicateIds.length,
				remainingEvents: calendar.events.length - duplicateIds.length,
			};
		}),

	importIcsIntoCalendar: authOrAnonProcedure
		.input(
			z.object({
				calendarId: z.string(),
				fileContent: z.string(),
				removeDuplicates: z.boolean().optional().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify calendar ownership
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: true,
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			validateFileSize(input.fileContent);

			const parseResult = parseIcsFile(input.fileContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Impossible de parser le fichier ICS : ${parseResult.errors.join(", ")}`,
				});
			}

			// Filter duplicates if requested using enhanced detection
			let eventsToImport = parseResult.events;
			let skippedDuplicates = 0;

			if (input.removeDuplicates) {
				// Adapt parsed events to the duplicate check interface
				const newEventsForCheck = parseResult.events.map((e, idx) => ({
					id: `new-${idx}`,
					uid: e.uid,
					title: e.title,
					startDate: e.startDate,
					endDate: e.endDate,
					location: e.location,
				}));

				const existingEventsForCheck = calendar.events.map((e) => ({
					id: e.id,
					uid: e.uid,
					title: e.title,
					startDate: e.startDate,
					endDate: e.endDate,
					location: e.location,
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
				url: z.string().url("URL invalide"),
				name: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await checkAnonymousCalendarLimit(ctx);

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
						message: `Impossible de récupérer le calendrier: ${response.status} ${response.statusText}`,
					});
				}

				icsContent = await response.text();
			} catch (error) {
				if (error instanceof TRPCError) throw error;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Erreur lors de la récupération du calendrier: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
				});
			}

			validateFileSize(icsContent);
			const parseResult = parseIcsFile(icsContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Impossible de parser le fichier ICS: ${parseResult.errors.join(", ")}`,
				});
			}

			// Create calendar with sourceUrl
			const calendar = await prisma.calendar.create({
				data: {
					name:
						input.name ||
						`Calendrier importé - ${new Date().toLocaleDateString("fr-FR")}`,
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
	 * Re-imports all events, optionally removing old events first
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
			// Find the calendar
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					...buildOwnershipFilter(ctx),
				},
				include: { events: true },
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendrier non trouvé",
				});
			}

			if (!calendar.sourceUrl) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Ce calendrier n'a pas d'URL source. Il ne peut pas être actualisé.",
				});
			}

			// Fetch the ICS content
			let icsContent: string;
			try {
				const response = await fetch(calendar.sourceUrl, {
					headers: {
						Accept: "text/calendar, application/calendar+xml, */*",
						"User-Agent": "Calendraft/1.0",
					},
					signal: AbortSignal.timeout(30000),
				});

				if (!response.ok) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Impossible de récupérer le calendrier: ${response.status} ${response.statusText}`,
					});
				}

				icsContent = await response.text();
			} catch (error) {
				if (error instanceof TRPCError) throw error;
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Erreur lors de la récupération du calendrier: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
				});
			}

			validateFileSize(icsContent);
			const parseResult = parseIcsFile(icsContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Impossible de parser le fichier ICS: ${parseResult.errors.join(", ")}`,
				});
			}

			let deletedCount = 0;
			let importedCount = 0;
			let skippedCount = 0;

			// Delete all existing events if replaceAll
			if (input.replaceAll) {
				const deleteResult = await prisma.event.deleteMany({
					where: { calendarId: input.calendarId },
				});
				deletedCount = deleteResult.count;
			}

			// Filter duplicates if not replacing all
			let eventsToImport = parseResult.events;
			if (!input.replaceAll && input.skipDuplicates) {
				const newEventsForCheck = parseResult.events.map((e, idx) => ({
					id: `new-${idx}`,
					uid: e.uid,
					title: e.title,
					startDate: e.startDate,
					endDate: e.endDate,
					location: e.location,
				}));

				const existingEventsForCheck = calendar.events.map((e) => ({
					id: e.id,
					uid: e.uid,
					title: e.title,
					startDate: e.startDate,
					endDate: e.endDate,
					location: e.location,
				}));

				const { unique, duplicates } = findDuplicatesAgainstExisting(
					newEventsForCheck,
					existingEventsForCheck,
					{ useUid: true, useTitle: true, dateTolerance: 60000 },
				);

				const uniqueIndices = new Set(
					unique.map((e) => Number.parseInt(e.id.replace("new-", ""), 10)),
				);
				eventsToImport = parseResult.events.filter((_, idx) =>
					uniqueIndices.has(idx),
				);
				skippedCount = duplicates.length;
			}

			// Create events
			for (const parsedEvent of eventsToImport) {
				await createEventFromParsed(input.calendarId, parsedEvent);
				importedCount++;
			}

			// Update lastSyncedAt
			await prisma.calendar.update({
				where: { id: input.calendarId },
				data: { lastSyncedAt: new Date() },
			});

			return {
				importedEvents: importedCount,
				deletedEvents: deletedCount,
				skippedDuplicates: skippedCount,
				warnings: parseResult.errors,
			};
		}),

	/**
	 * Get usage statistics for the current user
	 * Returns limits and current usage (useful for anonymous users)
	 */
	getUsage: authOrAnonProcedure.query(async ({ ctx }) => {
		const usage = await getAnonymousUsage(ctx);
		return usage;
	}),
});

// Export cleanup utilities for use in jobs
export { cleanupOrphanedAnonymousCalendars } from "../lib/cleanup";
