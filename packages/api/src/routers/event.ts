import prisma from "@calendraft/db";
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
import { checkAnonymousEventLimit } from "../middleware";

/**
 * Verify event access permissions
 */
async function verifyEventAccess(
	eventId: string,
	userId: string,
	sessionUserId?: string,
) {
	const event = await prisma.event.findFirst({
		where: { id: eventId },
		include: { calendar: true },
	});

	if (!event) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Event not found",
		});
	}

	const calendar = await prisma.calendar.findFirst({
		where: {
			id: event.calendarId,
			OR: [
				...(sessionUserId ? [{ userId: sessionUserId }] : []),
				...(userId ? [{ userId }] : []),
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
}

/**
 * Verify calendar access for duplication
 */
async function verifyCalendarAccess(
	calendarId: string,
	sessionUserId?: string,
	anonymousId?: string,
) {
	// First check if calendar exists (without ownership filter)
	const calendarExists = await prisma.calendar.findUnique({
		where: { id: calendarId },
		select: { id: true, userId: true },
	});

	if (!calendarExists) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Calendar not found",
		});
	}

	// Check if user has access to this calendar
	const calendar = await prisma.calendar.findFirst({
		where: {
			id: calendarId,
			OR: [
				...(sessionUserId ? [{ userId: sessionUserId }] : []),
				...(anonymousId ? [{ userId: anonymousId }] : []),
			],
		},
	});

	if (!calendar) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Access denied to this calendar",
		});
	}

	return calendar;
}

/**
 * Validate UID uniqueness if being changed
 */
async function validateUidChange(
	newUid: string | null | undefined,
	currentUid: string | null,
	eventId: string,
	calendarId: string,
) {
	if (newUid !== undefined && newUid !== currentUid) {
		if (newUid) {
			const existingEvent = await prisma.event.findFirst({
				where: {
					uid: newUid,
					calendarId,
					id: { not: eventId },
				},
			});
			if (existingEvent) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "An event with this UID already exists in this calendar",
				});
			}
		}
	}
}

/**
 * Validate RELATED-TO if being changed
 */
async function validateRelatedToChange(
	newRelatedTo: string | null | undefined,
	currentRelatedTo: string | null,
	eventId: string,
	calendarId: string,
) {
	if (newRelatedTo !== undefined && newRelatedTo !== currentRelatedTo) {
		if (newRelatedTo) {
			const relatedEvent = await prisma.event.findFirst({
				where: {
					uid: newRelatedTo,
					calendarId,
				},
			});
			if (!relatedEvent) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"The related event (RELATED-TO) does not exist in this calendar",
				});
			}
			if (relatedEvent.id === eventId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "An event cannot be related to itself",
				});
			}
		}
	}
}

/**
 * Update event relations (attendees, alarms, categories, resources, recurrenceDates)
 */
async function updateEventRelations(
	eventId: string,
	input: {
		attendees?: unknown;
		alarms?: unknown;
		categories?: unknown;
		resources?: unknown;
		rdate?: unknown;
		exdate?: unknown;
	},
	updateData: Record<string, unknown>,
) {
	if (input.attendees !== undefined) {
		await prisma.eventAttendee.deleteMany({ where: { eventId } });
		updateData.attendees = prepareAttendeeData(input.attendees as never);
	}

	if (input.alarms !== undefined) {
		await prisma.eventAlarm.deleteMany({ where: { eventId } });
		updateData.alarms = prepareAlarmData(input.alarms as never);
	}

	if (input.categories !== undefined) {
		await prisma.eventCategory.deleteMany({ where: { eventId } });
		updateData.categories = prepareCategoriesData(input.categories as never);
	}

	if (input.resources !== undefined) {
		await prisma.eventResource.deleteMany({ where: { eventId } });
		updateData.resources = prepareResourcesData(input.resources as never);
	}

	if (input.rdate !== undefined || input.exdate !== undefined) {
		await prisma.recurrenceDate.deleteMany({ where: { eventId } });
		updateData.recurrenceDates = prepareRecurrenceDatesData(
			input.rdate as never,
			input.exdate as never,
		);
	}
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
			// First check if calendar exists (without ownership filter)
			const calendarExists = await prisma.calendar.findUnique({
				where: { id: input.calendarId },
				select: { id: true, userId: true },
			});

			if (!calendarExists) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

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
					code: "FORBIDDEN",
					message: "Access denied to this calendar",
				});
			}

			// Build where clause
			const where: {
				calendarId: string;
				id?: { gt: string };
				startDate?: { gte?: Date; lte?: Date };
				OR?: Array<{
					title?: { contains: string; mode: "insensitive" };
					description?: { contains: string; mode: "insensitive" };
					location?: { contains: string; mode: "insensitive" };
				}>;
			} = {
				calendarId: input.calendarId,
			};

			if (input.cursor) {
				where.id = {
					gt: input.cursor,
				};
			}

			if (input.filterDateFrom || input.filterDateTo) {
				where.startDate = {};
				if (input.filterDateFrom) {
					where.startDate.gte = input.filterDateFrom;
				}
				if (input.filterDateTo) {
					where.startDate.lte = input.filterDateTo;
				}
			}

			// Multi-field search: title, description, location
			// Trim keyword and only search if non-empty
			const trimmedKeyword = input.filterKeyword?.trim();
			if (trimmedKeyword && trimmedKeyword.length > 0) {
				where.OR = [
					{ title: { contains: trimmedKeyword, mode: "insensitive" } },
					{ description: { contains: trimmedKeyword, mode: "insensitive" } },
					{ location: { contains: trimmedKeyword, mode: "insensitive" } },
				];
			}

			// Build orderBy
			// sortDirection is only used for "date" sort
			// "name" and "duration" are always unidirectional (ignoring sortDirection)
			let orderBy: { title?: "asc" | "desc"; startDate?: "asc" | "desc" } = {};
			switch (input.sortBy) {
				case "name":
					orderBy = { title: "asc" }; // Always A-Z, sortDirection is ignored
					break;
				case "duration":
					orderBy = {
						// Sort by duration (endDate - startDate)
						startDate: "asc", // Always ascending, sortDirection is ignored
					};
					break;
				default: // date
					// Use sortDirection for date sorting (asc = future first, desc = past first)
					orderBy = { startDate: input.sortDirection || "asc" };
					break;
			}

			// Fetch one extra to determine if there's a next page
			const events = await prisma.event.findMany({
				where,
				orderBy,
				take: input.limit + 1,
				include: {
					attendees: true,
					alarms: true,
					categories: true,
					resources: true,
				},
			});

			// If sorting by duration, sort in memory
			if (input.sortBy === "duration") {
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

			return {
				events,
				nextCursor,
			};
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
			await checkAnonymousEventLimit(ctx, input.calendarId);

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
			const event = await verifyEventAccess(
				input.id,
				ctx.anonymousId || "",
				ctx.session?.user?.id,
			);

			// Validate changes
			await validateUidChange(input.uid, event.uid, input.id, event.calendarId);
			await validateRelatedToChange(
				input.relatedTo,
				event.relatedTo,
				input.id,
				event.calendarId,
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

			// Update relations
			await updateEventRelations(input.id, input, updateData);

			return await prisma.event.update({
				where: { id: input.id },
				data: {
					...updateData,
					dtstamp: new Date(),
				},
				include: {
					attendees: true,
					alarms: true,
					categories: true,
					resources: true,
					recurrenceDates: true,
				},
			});
		}),

	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify access
			await verifyEventAccess(
				input.id,
				ctx.anonymousId || "",
				ctx.session?.user?.id,
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

			await checkAnonymousEventLimit(ctx, targetCalendarId);

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
