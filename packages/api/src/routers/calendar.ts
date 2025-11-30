import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { publicProcedure, router } from "../index";
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
	requireAuth,
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
		description: parsedEvent.description || null,
		location: parsedEvent.location || null,
		status: parseEventStatus(parsedEvent.status),
		priority: parsedEvent.priority ?? null,
		url: parsedEvent.url || null,
		class: parseEventClass(parsedEvent.class),
		comment: parsedEvent.comment || null,
		contact: parsedEvent.contact || null,
		sequence: parsedEvent.sequence ?? 0,
		transp: parseEventTransparency(parsedEvent.transp),
		rrule: parsedEvent.rrule || null,
		geoLatitude: parsedEvent.geoLatitude ?? null,
		geoLongitude: parsedEvent.geoLongitude ?? null,
		organizerName: parsedEvent.organizerName || null,
		organizerEmail: parsedEvent.organizerEmail || null,
		uid: parsedEvent.uid || null,
		dtstamp: parsedEvent.dtstamp || new Date(),
		created: parsedEvent.created || null,
		lastModified: parsedEvent.lastModified || null,
		recurrenceId: parsedEvent.recurrenceId || null,
		relatedTo: parsedEvent.relatedTo || null,
		color: parsedEvent.color || null,
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
	list: publicProcedure.query(async ({ ctx }) => {
		requireAuth(ctx);

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
			createdAt: cal.createdAt,
			updatedAt: cal.updatedAt,
		}));
	}),

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			requireAuth(ctx);

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
					message: "Calendar not found",
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

	create: publicProcedure
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
			requireAuth(ctx);
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

	update: publicProcedure
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
			requireAuth(ctx);

			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
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

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			requireAuth(ctx);

			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			await prisma.calendar.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	importIcs: publicProcedure
		.input(
			z.object({
				fileContent: z.string(),
				name: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			requireAuth(ctx);

			validateFileSize(input.fileContent);

			const parseResult = parseIcsFile(input.fileContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Failed to parse ICS file: ${parseResult.errors.join(", ")}`,
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

	exportIcs: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			requireAuth(ctx);

			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.id,
					...buildOwnershipFilter(ctx),
				},
				include: {
					events: {
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
					message: "Calendar not found",
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

	merge: publicProcedure
		.input(
			z.object({
				calendarIds: z.array(z.string()).min(2),
				name: z.string().min(1),
				removeDuplicates: z.boolean().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			requireAuth(ctx);

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
					message: "One or more calendars not found",
				});
			}

			// Collect all events
			const allEvents = calendars.flatMap((cal) => cal.events);

			// Remove duplicates if requested
			let eventsToMerge = allEvents;
			if (input.removeDuplicates) {
				const seen = new Set<string>();
				eventsToMerge = allEvents.filter((event) => {
					// Create a key: title + startDate + endDate
					const key = `${event.title}|${event.startDate.toISOString()}|${event.endDate.toISOString()}`;
					if (seen.has(key)) {
						return false;
					}
					seen.add(key);
					return true;
				});
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

	cleanDuplicates: publicProcedure
		.input(z.object({ calendarId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			requireAuth(ctx);

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
					message: "Calendar not found",
				});
			}

			// Detect duplicates
			const seen = new Set<string>();
			const duplicateIds: string[] = [];

			for (const event of calendar.events) {
				const key = `${event.title}|${event.startDate.toISOString()}|${event.endDate.toISOString()}`;
				if (seen.has(key)) {
					duplicateIds.push(event.id);
				} else {
					seen.add(key);
				}
			}

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

	importIcsIntoCalendar: publicProcedure
		.input(
			z.object({
				calendarId: z.string(),
				fileContent: z.string(),
				removeDuplicates: z.boolean().optional().default(false),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			requireAuth(ctx);

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
					message: "Calendar not found",
				});
			}

			validateFileSize(input.fileContent);

			const parseResult = parseIcsFile(input.fileContent);

			if (parseResult.errors.length > 0 && parseResult.events.length === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Failed to parse ICS file: ${parseResult.errors.join(", ")}`,
				});
			}

			// Filter duplicates if requested
			let eventsToImport = parseResult.events;
			let skippedDuplicates = 0;

			if (input.removeDuplicates) {
				const existingKeys = new Set(
					calendar.events.map(
						(event) =>
							`${event.title}|${event.startDate.toISOString()}|${event.endDate.toISOString()}`,
					),
				);

				eventsToImport = parseResult.events.filter((event) => {
					const key = `${event.title}|${event.startDate.toISOString()}|${event.endDate.toISOString()}`;
					if (existingKeys.has(key)) {
						skippedDuplicates++;
						return false;
					}
					return true;
				});
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
	 * Get usage statistics for the current user
	 * Returns limits and current usage (useful for anonymous users)
	 */
	getUsage: publicProcedure.query(async ({ ctx }) => {
		requireAuth(ctx);
		const usage = await getAnonymousUsage(ctx);
		return usage;
	}),
});

// Export cleanup utilities for use in jobs
export { cleanupOrphanedAnonymousCalendars } from "../lib/cleanup";
