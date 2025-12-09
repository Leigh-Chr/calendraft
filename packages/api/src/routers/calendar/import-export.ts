/**
 * Calendar import/export operations
 * Extracted from calendar.ts for better maintainability
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, router } from "../../index";
import { parseIcsFile } from "../../lib/ics-parser";
import { buildOwnershipFilter } from "../../middleware";
import { createEventFromParsed, validateFileSize } from "./helpers";

export const calendarImportExportRouter = router({
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
					message: `Unable to parse ICS file: ${parseResult.errors.join(", ")}`,
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

			// First check if calendar exists (without ownership filter)
			const calendarExists = await prisma.calendar.findUnique({
				where: { id: input.id },
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
				// Calendar exists but user doesn't have access
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Access denied to this calendar",
				});
			}

			// Import the generator here to avoid circular dependencies
			const { generateIcs } = await import("../../lib/ics-generator");

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
});
