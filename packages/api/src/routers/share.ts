import { randomBytes } from "node:crypto";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, publicProcedure, router } from "../index";
import { buildOwnershipFilter } from "../middleware";

/**
 * Generate a secure random token for share links
 * Uses URL-safe base64 encoding
 */
function generateShareToken(): string {
	return randomBytes(32).toString("base64url");
}

export const shareRouter = router({
	/**
	 * Create a new share link for a calendar
	 * Limited to 10 share links per calendar to prevent abuse
	 */
	create: authOrAnonProcedure
		.input(
			z.object({
				calendarId: z.string(),
				name: z.string().max(100).optional(),
				expiresAt: z.string().datetime().optional(), // ISO datetime string
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify the user owns this calendar
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Count existing share links for this calendar
			const shareLinkCount = await prisma.calendarShareLink.count({
				where: { calendarId: input.calendarId },
			});

			// Limit to 10 share links per calendar
			const MAX_SHARE_LINKS_PER_CALENDAR = 10;
			if (shareLinkCount >= MAX_SHARE_LINKS_PER_CALENDAR) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: `Limit reached: you can only create ${MAX_SHARE_LINKS_PER_CALENDAR} share links per calendar. Delete an existing link to create a new one.`,
				});
			}

			// Generate unique token
			const token = generateShareToken();

			// Create the share link
			const shareLink = await prisma.calendarShareLink.create({
				data: {
					calendarId: input.calendarId,
					token,
					name: input.name || null,
					expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
				},
			});

			return {
				id: shareLink.id,
				token: shareLink.token,
				name: shareLink.name,
				isActive: shareLink.isActive,
				expiresAt: shareLink.expiresAt,
				createdAt: shareLink.createdAt,
			};
		}),

	/**
	 * List all share links for a calendar
	 */
	list: authOrAnonProcedure
		.input(z.object({ calendarId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify the user owns this calendar
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: input.calendarId,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			const shareLinks = await prisma.calendarShareLink.findMany({
				where: { calendarId: input.calendarId },
				orderBy: { createdAt: "desc" },
			});

			return shareLinks.map((link) => ({
				id: link.id,
				token: link.token,
				name: link.name,
				isActive: link.isActive,
				expiresAt: link.expiresAt,
				accessCount: link.accessCount,
				lastAccessedAt: link.lastAccessedAt,
				createdAt: link.createdAt,
			}));
		}),

	/**
	 * Update a share link (toggle active, change name, expiration)
	 */
	update: authOrAnonProcedure
		.input(
			z.object({
				id: z.string(),
				name: z.string().max(100).optional().nullable(),
				isActive: z.boolean().optional(),
				expiresAt: z.string().datetime().optional().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Find the share link and verify ownership via calendar
			const shareLink = await prisma.calendarShareLink.findUnique({
				where: { id: input.id },
			});

			if (!shareLink) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sharing link not found",
				});
			}

			// Verify calendar ownership
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: shareLink.calendarId,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			// Build update data
			const updateData: {
				name?: string | null;
				isActive?: boolean;
				expiresAt?: Date | null;
			} = {};

			if (input.name !== undefined) {
				updateData.name = input.name;
			}
			if (input.isActive !== undefined) {
				updateData.isActive = input.isActive;
			}
			if (input.expiresAt !== undefined) {
				updateData.expiresAt = input.expiresAt
					? new Date(input.expiresAt)
					: null;
			}

			const updated = await prisma.calendarShareLink.update({
				where: { id: input.id },
				data: updateData,
			});

			return {
				id: updated.id,
				token: updated.token,
				name: updated.name,
				isActive: updated.isActive,
				expiresAt: updated.expiresAt,
				accessCount: updated.accessCount,
				lastAccessedAt: updated.lastAccessedAt,
				createdAt: updated.createdAt,
			};
		}),

	/**
	 * Delete a share link
	 */
	delete: authOrAnonProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Find the share link
			const shareLink = await prisma.calendarShareLink.findUnique({
				where: { id: input.id },
			});

			if (!shareLink) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sharing link not found",
				});
			}

			// Verify calendar ownership
			const calendar = await prisma.calendar.findFirst({
				where: {
					id: shareLink.calendarId,
					...buildOwnershipFilter(ctx),
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			await prisma.calendarShareLink.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),

	/**
	 * PUBLIC: Access a shared calendar by token
	 * Returns ICS content for download
	 */
	getByToken: publicProcedure
		.input(z.object({ token: z.string() }))
		.query(async ({ input }) => {
			// Find the share link
			const shareLink = await prisma.calendarShareLink.findUnique({
				where: { token: input.token },
			});

			if (!shareLink) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sharing link not found or expired",
				});
			}

			// Check if active
			if (!shareLink.isActive) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This share link has been disabled",
				});
			}

			// Check expiration
			if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This share link has expired",
				});
			}

			// Get the calendar with events
			const calendar = await prisma.calendar.findUnique({
				where: { id: shareLink.calendarId },
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

			// Update access stats (fire and forget)
			prisma.calendarShareLink
				.update({
					where: { id: shareLink.id },
					data: {
						accessCount: { increment: 1 },
						lastAccessedAt: new Date(),
					},
				})
				.catch(console.error);

			// Import the generator
			const { generateIcs } = await import("../lib/ics-generator");

			// Convert events to ICS format
			const convertEventToIcsFormat = (event: (typeof calendar.events)[0]) => {
				const categoriesStr =
					event.categories.length > 0
						? event.categories.map((c) => c.category).join(",")
						: null;

				const resourcesStr =
					event.resources.length > 0
						? event.resources.map((r) => r.resource).join(",")
						: null;

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

			return {
				icsContent,
				calendarName: calendar.name,
				eventCount: calendar.events.length,
			};
		}),

	/**
	 * PUBLIC: Get calendar info by token (without ICS content)
	 * Used to display info before downloading
	 */
	getInfoByToken: publicProcedure
		.input(z.object({ token: z.string() }))
		.query(async ({ input }) => {
			// Find the share link
			const shareLink = await prisma.calendarShareLink.findUnique({
				where: { token: input.token },
			});

			if (!shareLink) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sharing link not found or expired",
				});
			}

			// Check if active
			if (!shareLink.isActive) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This share link has been disabled",
				});
			}

			// Check expiration
			if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This share link has expired",
				});
			}

			// Get basic calendar info
			const calendar = await prisma.calendar.findUnique({
				where: { id: shareLink.calendarId },
				select: {
					name: true,
					_count: {
						select: { events: true },
					},
				},
			});

			if (!calendar) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Calendar not found",
				});
			}

			return {
				calendarName: calendar.name,
				eventCount: calendar._count.events,
				shareName: shareLink.name,
			};
		}),
});
