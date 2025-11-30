import prisma from "@calendraft/db";
import { eventCreateSchema, eventUpdateSchema } from "@calendraft/schemas";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { publicProcedure, router } from "../index";
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
					message: "Un événement avec cet UID existe déjà dans ce calendrier",
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
						"L'événement lié (RELATED-TO) n'existe pas dans ce calendrier",
				});
			}
			if (relatedEvent.id === eventId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Un événement ne peut pas être lié à lui-même",
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
	list: publicProcedure
		.input(
			z.object({
				calendarId: z.string(),
				sortBy: z.enum(["date", "name", "duration"]).optional().default("date"),
				filterDateFrom: z.coerce.date().optional(),
				filterDateTo: z.coerce.date().optional(),
				filterKeyword: z.string().optional(),
				limit: z.number().int().min(1).max(100).optional().default(50),
				cursor: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			if (!ctx.userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User ID required",
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
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Build where clause
			const where: {
				calendarId: string;
				id?: { gt: string };
				startDate?: { gte?: Date; lte?: Date };
				title?: { contains: string; mode: "insensitive" };
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

			if (input.filterKeyword) {
				where.title = {
					contains: input.filterKeyword,
					mode: "insensitive",
				};
			}

			// Build orderBy
			let orderBy: { title?: "asc" | "desc"; startDate?: "asc" | "desc" } = {};
			switch (input.sortBy) {
				case "name":
					orderBy = { title: "asc" };
					break;
				case "duration":
					orderBy = {
						// Sort by duration (endDate - startDate)
						startDate: "asc",
					};
					break;
				default:
					orderBy = { startDate: "asc" };
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

	getById: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			if (!ctx.userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User ID required",
				});
			}

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

	create: publicProcedure
		.input(eventCreateSchema)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User ID required",
				});
			}

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
						message: "Un événement avec cet UID existe déjà dans ce calendrier",
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
							"L'événement lié (RELATED-TO) n'existe pas dans ce calendrier",
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
					...eventData,
					calendarId: input.calendarId,
					// RFC 5545: DTSTAMP is required for all VEVENT - set to current time if not provided
					dtstamp: new Date(),
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

	update: publicProcedure
		.input(eventUpdateSchema)
		.mutation(async ({ ctx, input }) => {
			if (!ctx.userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User ID required",
				});
			}

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
						"La séquence ne peut pas être diminuée manuellement. Elle est gérée automatiquement.",
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

	delete: publicProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.userId) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "User ID required",
				});
			}

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
});
