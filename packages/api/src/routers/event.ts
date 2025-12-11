import prisma, { Prisma } from "@calendraft/db";
import { eventCreateSchema, eventUpdateSchema } from "@calendraft/schemas";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../index";
import {
	prepareAlarmData,
	prepareAttendeeData,
	prepareCategoriesData,
	prepareEventData,
	prepareRecurrenceDatesData,
	prepareResourcesData,
} from "../lib/event-helpers";
import { checkEventLimit } from "../middleware";
import {
	verifyCalendarAccess,
	verifyCalendarAccessForList,
	verifyEventAccess,
} from "./event/access";
import { buildEventOrderBy, buildEventWhereClause } from "./event/queries";
import {
	updateEventAlarms,
	updateEventAttendees,
	updateEventCategories,
	updateEventRecurrenceDates,
	updateEventResources,
} from "./event/updates";
import { validateRelatedToChange, validateUidChange } from "./event/validation";

/**
 * Type helper for event update input
 */
type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

/**
 * Group event relations by eventId
 */
function groupEventRelations<T extends { eventId: string }>(
	items: T[],
): Map<string, T[]> {
	const map = new Map<string, T[]>();
	for (const item of items) {
		if (!map.has(item.eventId)) {
			map.set(item.eventId, []);
		}
		map.get(item.eventId)?.push(item);
	}
	return map;
}

/**
 * Get events sorted by duration using raw SQL
 */
async function getEventsSortedByDuration(
	calendarId: string,
	cursor: string | undefined,
	filterDateFrom: Date | undefined,
	filterDateTo: Date | undefined,
	limit: number,
) {
	const eventsRaw = await prisma.$queryRaw<
		Array<{
			id: string;
			calendarId: string;
			title: string;
			startDate: Date;
			endDate: Date;
			description: string | null;
			location: string | null;
			status: string | null;
			priority: number | null;
			url: string | null;
			class: string | null;
			comment: string | null;
			contact: string | null;
			sequence: number;
			transp: string | null;
			rrule: string | null;
			geoLatitude: number | null;
			geoLongitude: number | null;
			organizerName: string | null;
			organizerEmail: string | null;
			uid: string | null;
			dtstamp: Date | null;
			created: Date | null;
			lastModified: Date | null;
			recurrenceId: string | null;
			relatedTo: string | null;
			color: string | null;
			createdAt: Date;
			updatedAt: Date;
		}>
	>`
		SELECT e.*
		FROM event e
		WHERE e."calendarId" = ${calendarId}
			${cursor ? Prisma.sql`AND e.id > ${cursor}` : Prisma.empty}
			${filterDateFrom ? Prisma.sql`AND e."startDate" >= ${filterDateFrom}` : Prisma.empty}
			${filterDateTo ? Prisma.sql`AND e."startDate" <= ${filterDateTo}` : Prisma.empty}
		ORDER BY (e."endDate" - e."startDate") DESC
		LIMIT ${limit + 1}
	`;

	const eventIds = eventsRaw.map((e) => e.id);
	const [attendees, alarms, categories, resources] = await Promise.all([
		prisma.eventAttendee.findMany({ where: { eventId: { in: eventIds } } }),
		prisma.eventAlarm.findMany({ where: { eventId: { in: eventIds } } }),
		prisma.eventCategory.findMany({ where: { eventId: { in: eventIds } } }),
		prisma.eventResource.findMany({ where: { eventId: { in: eventIds } } }),
	]);

	const attendeesMap = groupEventRelations(attendees);
	const alarmsMap = groupEventRelations(alarms);
	const categoriesMap = groupEventRelations(categories);
	const resourcesMap = groupEventRelations(resources);

	const events = eventsRaw.map((event) => ({
		...event,
		attendees: attendeesMap.get(event.id) || [],
		alarms: alarmsMap.get(event.id) || [],
		categories: categoriesMap.get(event.id) || [],
		resources: resourcesMap.get(event.id) || [],
	}));

	return events;
}

/**
 * Fetch events with pagination and sorting
 */
async function fetchEventsWithPagination(input: {
	calendarId: string;
	where: Prisma.EventWhereInput;
	orderBy: { title?: "asc" | "desc"; startDate?: "asc" | "desc" };
	limit: number;
	sortBy: "date" | "name" | "duration";
	trimmedKeyword?: string;
}) {
	const events = await prisma.event.findMany({
		where: input.where,
		orderBy:
			input.sortBy === "duration" && input.trimmedKeyword
				? { startDate: "asc" }
				: input.orderBy,
		take: input.limit + 1,
		include: {
			attendees: true,
			alarms: true,
			categories: true,
			resources: true,
		},
	});

	// If sorting by duration with keyword filter, sort in memory
	if (input.sortBy === "duration" && input.trimmedKeyword) {
		events.sort((a, b) => {
			const durationA =
				b.endDate.getTime() -
				b.startDate.getTime() -
				(a.endDate.getTime() - a.startDate.getTime());
			return durationA;
		});
	}

	// Determine next cursor
	let nextCursor: string | undefined;
	if (events.length > input.limit) {
		const nextItem = events.pop();
		nextCursor = nextItem?.id;
	}

	return { events, nextCursor };
}

export const eventRouter = router({
	list: authOrAnonProcedure
		.input(
			z.object({
				calendarId: z.string(),
				sortBy: z.enum(["date", "name", "duration"]).optional().default("date"),
				sortDirection: z.enum(["asc", "desc"]).optional().default("asc"),
				filterDateFrom: z.coerce.date().optional(),
				filterDateTo: z.coerce.date().optional(),
				filterKeyword: z.string().optional(),
				limit: z.number().int().min(1).max(100).optional().default(50),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify calendar access
			await verifyCalendarAccessForList(input.calendarId, ctx);

			// Build where clause
			const { where, trimmedKeyword } = buildEventWhereClause({
				calendarId: input.calendarId,
				cursor: input.cursor,
				filterDateFrom: input.filterDateFrom,
				filterDateTo: input.filterDateTo,
				filterKeyword: input.filterKeyword,
			});

			// Handle duration sorting with SQL calculation (more efficient than in-memory)
			// Note: If filterKeyword is provided, we fall back to Prisma query for full-text search
			if (input.sortBy === "duration" && !trimmedKeyword) {
				const events = await getEventsSortedByDuration(
					input.calendarId,
					input.cursor,
					input.filterDateFrom,
					input.filterDateTo,
					input.limit,
				);

				// Determine next cursor
				let nextCursor: string | undefined;
				if (events.length > input.limit) {
					const nextItem = events.pop();
					nextCursor = nextItem?.id;
				}

				return {
					events,
					nextCursor,
				};
			}

			// Build orderBy for non-duration sorts, or duration with keyword filter
			const orderBy = buildEventOrderBy(input.sortBy, input.sortDirection);

			// Fetch events with pagination
			return fetchEventsWithPagination({
				calendarId: input.calendarId,
				where,
				orderBy,
				limit: input.limit,
				sortBy: input.sortBy,
				trimmedKeyword,
			});
		}),

	getById: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const event = await prisma.event.findFirst({
				where: { id: input.id },
				include: {
					calendar: true,
					attendees: true,
					alarms: true,
					categories: true,
					resources: true,
					recurrenceDates: true,
				},
			});

			if (!event) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				});
			}

			// Verify calendar belongs to user
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: event.calendarId,
					OR: [
						...(ctx.session?.user?.id ? [{ userId: ctx.session.user.id }] : []),
						...(ctx.anonymousId ? [{ userId: ctx.anonymousId }] : []),
					],
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied",
				});
			}

			return event;
		}),

	create: authOrAnonProcedure
		.input(eventCreateSchema)
		.mutation(async ({ ctx, input }) => {
			// Check event limit for anonymous users
			await checkEventLimit(ctx, input.calendarId);

			// Verify calendar belongs to user
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					OR: [
						...(ctx.session?.user?.id ? [{ userId: ctx.session.user.id }] : []),
						...(ctx.anonymousId ? [{ userId: ctx.anonymousId }] : []),
					],
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Note: Date validation and geo coordinates validation
			// are now handled by the Zod schema (eventCreateSchema)

			// Validate UID uniqueness if provided
			if (input.uid) {
				const existingEvent = await prisma.event.findFirst({
					where: {
						uid: input.uid,
						calendarId: input.calendarId,
					},
				});
				if (existingEvent) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "An event with this UID already exists in this calendar",
					});
				}
			}

			// Validate RELATED-TO if provided
			if (input.relatedTo) {
				const relatedEvent = await prisma.event.findFirst({
					where: {
						uid: input.relatedTo,
						calendarId: input.calendarId,
					},
				});
				if (!relatedEvent) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"The related event (RELATED-TO) does not exist in this calendar",
					});
				}
			}

			// Note: RECURRENCE-ID format and RRULE dependency validation
			// are now handled by the Zod schema (eventCreateSchema)

			// Prepare event data
			const eventData = prepareEventData({
				title: input.title,
				startDate: input.startDate,
				endDate: input.endDate,
				description: input.description,
				location: input.location,
				status: input.status,
				priority: input.priority,
				url: input.url,
				class: input.class,
				comment: input.comment,
				contact: input.contact,
				sequence: input.sequence,
				transp: input.transp,
				rrule: input.rrule,
				geoLatitude: input.geoLatitude,
				geoLongitude: input.geoLongitude,
				organizerName: input.organizerName,
				organizerEmail: input.organizerEmail,
				uid: input.uid,
				recurrenceId: input.recurrenceId,
				relatedTo: input.relatedTo,
				color: input.color,
			});

			// Create event with normalized relations
			const event = await prisma.event.create({
				data: {
					// Required fields first
					title: input.title,
					startDate: input.startDate,
					endDate: input.endDate,
					calendarId: input.calendarId,
					// RFC 5545: DTSTAMP is required for all VEVENT - set to current time if not provided
					dtstamp: new Date(),
					// Other fields from prepareEventData
					...eventData,
					// Nested relations
					attendees: prepareAttendeeData(input.attendees),
					alarms: prepareAlarmData(input.alarms),
					categories: prepareCategoriesData(input.categories),
					resources: prepareResourcesData(input.resources),
					recurrenceDates: prepareRecurrenceDatesData(
						input.rdate,
						input.exdate,
					),
				},
				include: {
					attendees: true,
					alarms: true,
					categories: true,
					resources: true,
					recurrenceDates: true,
				},
			});

			return event;
		}),

	update: authOrAnonProcedure
		.input(eventUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify access
			await verifyEventAccess(
				input.id,
				ctx.session?.user?.id,
				ctx.anonymousId || undefined,
			);

			// Fetch full event data for validation
			const event = await prisma.event.findUnique({
				where: { id: input.id },
				select: {
					id: true,
					calendarId: true,
					uid: true,
					relatedTo: true,
					sequence: true,
				},
			});

			if (!event) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				});
			}

			// Validate changes
			await validateUidChange(input.uid, event.uid, event.calendarId, input.id);
			await validateRelatedToChange(
				input.relatedTo,
				event.calendarId,
				input.id,
			);

			// Prevent manual sequence manipulation
			if (
				input.sequence !== undefined &&
				input.sequence !== null &&
				input.sequence < event.sequence
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Sequence cannot be manually decreased. It is managed automatically.",
				});
			}

			// Prepare update data
			const updateData = prepareEventData({
				title: input.title,
				startDate: input.startDate,
				endDate: input.endDate,
				description: input.description,
				location: input.location,
				status: input.status,
				priority: input.priority,
				url: input.url,
				class: input.class,
				comment: input.comment,
				contact: input.contact,
				sequence:
					input.sequence !== undefined ? input.sequence : event.sequence + 1,
				transp: input.transp,
				rrule: input.rrule,
				geoLatitude: input.geoLatitude,
				geoLongitude: input.geoLongitude,
				organizerName: input.organizerName,
				organizerEmail: input.organizerEmail,
				uid: input.uid,
				recurrenceId: input.recurrenceId,
				relatedTo: input.relatedTo,
				color: input.color,
			});

			// Update relations and event in a transaction to ensure atomicity
			return await prisma.$transaction(async (tx) => {
				// Prepare Prisma update data with relations
				// Use type annotation to work around Prisma's complex nested types
				type PrismaEventUpdateData = Parameters<
					typeof tx.event.update
				>[0]["data"];
				const prismaUpdateData: PrismaEventUpdateData = {
					...updateData,
					dtstamp: new Date(),
				};

				// Update relations first
				await updateEventAttendees(
					tx,
					input.id,
					input.attendees as EventUpdateInput["attendees"],
					prismaUpdateData,
				);
				await updateEventAlarms(
					tx,
					input.id,
					input.alarms as EventUpdateInput["alarms"],
					prismaUpdateData,
				);
				await updateEventCategories(
					tx,
					input.id,
					input.categories as EventUpdateInput["categories"],
					prismaUpdateData,
				);
				await updateEventResources(
					tx,
					input.id,
					input.resources as EventUpdateInput["resources"],
					prismaUpdateData,
				);
				await updateEventRecurrenceDates(
					tx,
					input.id,
					input.rdate as EventUpdateInput["rdate"],
					input.exdate as EventUpdateInput["exdate"],
					prismaUpdateData,
				);

				// Update event
				return await tx.event.update({
					where: { id: input.id },
					data: prismaUpdateData,
					include: {
						attendees: true,
						alarms: true,
						categories: true,
						resources: true,
						recurrenceDates: true,
					},
				});
			});
		}),

	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify access
			await verifyEventAccess(
				input.id,
				ctx.session?.user?.id,
				ctx.anonymousId || undefined,
			);

			await prisma.event.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	duplicate: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				targetCalendarId: z.string().optional(),
				dayOffset: z.number().int().optional().default(0),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify access to source event
			const sourceEvent = await prisma.event.findFirst({
				where: { id: input.id },
				include: {
					calendar: true,
					attendees: true,
					alarms: true,
					categories: true,
					resources: true,
					recurrenceDates: true,
				},
			});

			if (!sourceEvent) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Event not found",
				});
			}

			// Verify source calendar access
			await verifyCalendarAccess(
				sourceEvent.calendarId,
				ctx.session?.user?.id,
				ctx.anonymousId ?? undefined,
			);

			// Determine and verify target calendar
			const targetCalendarId = input.targetCalendarId || sourceEvent.calendarId;
			if (targetCalendarId !== sourceEvent.calendarId) {
				await verifyCalendarAccess(
					targetCalendarId,
					ctx.session?.user?.id,
					ctx.anonymousId ?? undefined,
				);
			}

			await checkEventLimit(ctx, targetCalendarId);

			// Calculate new dates with offset
			const offsetMs = input.dayOffset * 24 * 60 * 60 * 1000;
			const newStartDate = new Date(sourceEvent.startDate.getTime() + offsetMs);
			const newEndDate = new Date(sourceEvent.endDate.getTime() + offsetMs);

			// Create duplicated event
			const duplicatedEvent = await prisma.event.create({
				data: {
					calendarId: targetCalendarId,
					title: sourceEvent.title,
					startDate: newStartDate,
					endDate: newEndDate,
					description: sourceEvent.description,
					location: sourceEvent.location,
					status: sourceEvent.status,
					priority: sourceEvent.priority,
					url: sourceEvent.url,
					class: sourceEvent.class,
					comment: sourceEvent.comment,
					contact: sourceEvent.contact,
					sequence: 0,
					transp: sourceEvent.transp,
					geoLatitude: sourceEvent.geoLatitude,
					geoLongitude: sourceEvent.geoLongitude,
					organizerName: sourceEvent.organizerName,
					organizerEmail: sourceEvent.organizerEmail,
					uid: null,
					dtstamp: new Date(),
					color: sourceEvent.color,
					attendees:
						sourceEvent.attendees.length > 0
							? {
									create: sourceEvent.attendees.map((a) => ({
										name: a.name,
										email: a.email,
										role: a.role,
										status: a.status,
										rsvp: a.rsvp,
									})),
								}
							: undefined,
					alarms:
						sourceEvent.alarms.length > 0
							? {
									create: sourceEvent.alarms.map((a) => ({
										trigger: a.trigger,
										action: a.action,
										summary: a.summary,
										description: a.description,
										duration: a.duration,
										repeat: a.repeat,
									})),
								}
							: undefined,
					categories:
						sourceEvent.categories.length > 0
							? {
									create: sourceEvent.categories.map((c) => ({
										category: c.category,
									})),
								}
							: undefined,
					resources:
						sourceEvent.resources.length > 0
							? {
									create: sourceEvent.resources.map((r) => ({
										resource: r.resource,
									})),
								}
							: undefined,
				},
				include: {
					attendees: true,
					alarms: true,
					categories: true,
					resources: true,
					recurrenceDates: true,
				},
			});

			return duplicatedEvent;
		}),

	/**
	 * Bulk delete multiple events
	 */
	bulkDelete: authOrAnonProcedure
		.input(
			z.object({
				eventIds: z.array(z.string()).min(1).max(100),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get all events and verify they belong to calendars the user owns
			const events = await prisma.event.findMany({
				where: { id: { in: input.eventIds } },
				include: { calendar: true },
			});

			if (events.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No events found",
				});
			}

			// Get unique calendar IDs
			const calendarIds = [...new Set(events.map((e) => e.calendarId))];

			// Verify access to all calendars
			const accessibleCalendars = await prisma.calendar.findMany({
				where: {
					id: { in: calendarIds },
					OR: [
						...(ctx.session?.user?.id ? [{ userId: ctx.session.user.id }] : []),
						...(ctx.anonymousId ? [{ userId: ctx.anonymousId }] : []),
					],
				},
			});

			const accessibleCalendarIds = new Set(
				accessibleCalendars.map((c) => c.id),
			);

			// Filter to only events the user has access to
			const accessibleEventIds = events
				.filter((e) => accessibleCalendarIds.has(e.calendarId))
				.map((e) => e.id);

			if (accessibleEventIds.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to these events",
				});
			}

			// Delete accessible events
			const result = await prisma.event.deleteMany({
				where: { id: { in: accessibleEventIds } },
			});

			return {
				deletedCount: result.count,
				requestedCount: input.eventIds.length,
			};
		}),

	/**
	 * Bulk move events to another calendar
	 */
	bulkMove: authOrAnonProcedure
		.input(
			z.object({
				eventIds: z.array(z.string()).min(1).max(100),
				targetCalendarId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify access to target calendar
			const targetCalendar = await prisma.calendar.findFirst({
				where: {
					id: input.targetCalendarId,
					OR: [
						...(ctx.session?.user?.id ? [{ userId: ctx.session.user.id }] : []),
						...(ctx.anonymousId ? [{ userId: ctx.anonymousId }] : []),
					],
				},
			});

			if (!targetCalendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Destination calendar not found",
				});
			}

			// Get all events
			const events = await prisma.event.findMany({
				where: { id: { in: input.eventIds } },
				include: { calendar: true },
			});

			if (events.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No events found",
				});
			}

			// Get source calendar IDs
			const sourceCalendarIds = [...new Set(events.map((e) => e.calendarId))];

			// Verify access to all source calendars
			const accessibleCalendars = await prisma.calendar.findMany({
				where: {
					id: { in: sourceCalendarIds },
					OR: [
						...(ctx.session?.user?.id ? [{ userId: ctx.session.user.id }] : []),
						...(ctx.anonymousId ? [{ userId: ctx.anonymousId }] : []),
					],
				},
			});

			const accessibleCalendarIds = new Set(
				accessibleCalendars.map((c) => c.id),
			);

			// Filter to only events the user has access to
			const accessibleEventIds = events
				.filter((e) => accessibleCalendarIds.has(e.calendarId))
				.map((e) => e.id);

			if (accessibleEventIds.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You do not have access to these events",
				});
			}

			// Move events to target calendar
			const result = await prisma.event.updateMany({
				where: { id: { in: accessibleEventIds } },
				data: { calendarId: input.targetCalendarId },
			});

			return {
				movedCount: result.count,
				requestedCount: input.eventIds.length,
				targetCalendarId: input.targetCalendarId,
				targetCalendarName: targetCalendar.name,
			};
		}),
});
