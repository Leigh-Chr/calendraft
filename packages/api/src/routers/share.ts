import { randomBytes } from "node:crypto";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { authOrAnonProcedure, publicProcedure, router } from "../index";
import { deduplicateEvents } from "../lib/duplicate-detection";
import { logger } from "../lib/logger";
import { handlePrismaError } from "../lib/prisma-error-handler";
import { buildOwnershipFilter } from "../middleware";

/**
 * Generate a secure random token for share links
 * Uses URL-safe base64 encoding
 */
function generateShareToken(): string {
	return randomBytes(32).toString("base64url");
}

/**
 * Get calendar IDs for bundle creation
 */
async function getCalendarIdsForBundle(
	groupId: string | undefined,
	calendarIds: string[] | undefined,
	ctx: Parameters<typeof buildOwnershipFilter>[0],
): Promise<string[]> {
	if (groupId) {
		const group = await prisma.calendarGroup.findFirst({
			where: {
				id: groupId,
				...buildOwnershipFilter(ctx),
			},
			include: {
				calendars: {
					orderBy: {
						order: "asc",
					},
				},
			},
		});

		if (!group) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Group not found",
			});
		}

		const ids = group.calendars.map((c) => c.calendarId);

		if (ids.length === 0) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Group is empty. Add calendars to the group first.",
			});
		}

		if (ids.length > 15) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message:
					"Group contains too many calendars. Maximum 15 calendars per bundle.",
			});
		}

		return ids;
	}

	if (!calendarIds || calendarIds.length === 0) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Either groupId or calendarIds must be provided",
		});
	}

	return calendarIds;
}

/**
 * Check bundle limit for user
 */
async function checkBundleLimit(
	ctx: Parameters<typeof buildOwnershipFilter>[0],
): Promise<void> {
	const MAX_BUNDLES_PER_USER = 20;
	const userCalendarIds = await prisma.calendar.findMany({
		where: buildOwnershipFilter(ctx),
		select: { id: true },
	});

	const actualBundleCount = await prisma.calendarShareBundle.count({
		where: {
			calendars: {
				some: {
					calendarId: { in: userCalendarIds.map((c) => c.id) },
				},
			},
		},
	});

	if (actualBundleCount >= MAX_BUNDLES_PER_USER) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limit reached: you can only create ${MAX_BUNDLES_PER_USER} share bundles. Delete an existing bundle to create a new one.`,
		});
	}
}

export const shareRouter = router({
	/**
	 * PUBLIC: Detect share type by token (without throwing errors)
	 * Returns the type of share (single calendar or bundle) or null if not found
	 * This avoids throwing errors during detection
	 */
	detectType: publicProcedure
		.input(z.object({ token: z.string() }))
		.query(async ({ input }) => {
			// Try to find a single calendar share link
			const shareLink = await prisma.calendarShareLink.findUnique({
				where: { token: input.token },
				select: {
					id: true,
					isActive: true,
					expiresAt: true,
				},
			});

			if (shareLink) {
				// Check if active and not expired
				if (!shareLink.isActive) {
					return { type: null, reason: "disabled" as const };
				}
				if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
					return { type: null, reason: "expired" as const };
				}
				return { type: "single" as const };
			}

			// Try to find a bundle
			const bundle = await prisma.calendarShareBundle.findUnique({
				where: { token: input.token },
				select: {
					id: true,
					isActive: true,
					expiresAt: true,
				},
			});

			if (bundle) {
				// Check if active and not expired
				if (!bundle.isActive) {
					return { type: null, reason: "disabled" as const };
				}
				if (bundle.expiresAt && bundle.expiresAt < new Date()) {
					return { type: null, reason: "expired" as const };
				}
				return { type: "bundle" as const };
			}

			// Not found
			return { type: null, reason: "not_found" as const };
		}),

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
			let shareLink: Awaited<
				ReturnType<typeof prisma.calendarShareLink.create>
			>;
			try {
				shareLink = await prisma.calendarShareLink.create({
					data: {
						calendarId: input.calendarId,
						token,
						name: input.name || null,
						expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
					},
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

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

			let updated: Awaited<ReturnType<typeof prisma.calendarShareLink.update>>;
			try {
				updated = await prisma.calendarShareLink.update({
					where: { id: input.id },
					data: updateData,
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

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

			try {
				await prisma.calendarShareLink.delete({
					where: { id: input.id },
				});
			} catch (error) {
				handlePrismaError(error);
				throw error; // Never reached, but TypeScript needs it
			}

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
				.catch((error) => {
					// Log error but don't fail the request (non-critical operation)
					logger.error("[Share Link] Failed to update access stats", error);
				});

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
					color: true,
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
				calendarColor: calendar.color,
				eventCount: calendar._count.events,
				shareName: shareLink.name,
			};
		}),

	/**
	 * PUBLIC: Get calendar events by token (without ICS content)
	 * Used to display events on the shared calendar page
	 */
	getEventsByToken: publicProcedure
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
						orderBy: {
							startDate: "asc",
						},
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

			// Convert events to the format expected by the frontend
			const events = calendar.events.map((event) => {
				return {
					id: event.id,
					title: event.title,
					startDate: event.startDate.toISOString(),
					endDate: event.endDate.toISOString(),
					description: event.description,
					location: event.location,
					status: event.status,
					priority: event.priority,
					categories: event.categories.map((c) => ({ category: c.category })),
					url: event.url,
					class: event.class,
					rrule: event.rrule,
					color: event.color,
					attendees: event.attendees.map((a) => ({
						email: a.email,
						name: a.name,
					})),
					alarms: event.alarms.map((a) => ({
						action: a.action,
						trigger: a.trigger,
					})),
				};
			});

			return {
				calendarName: calendar.name,
				calendarColor: calendar.color,
				events,
			};
		}),

	// ========== BUNDLE ENDPOINTS ==========

	/**
	 * Create a new share bundle for multiple calendars
	 * Limited to 20 bundles per user and 15 calendars per bundle
	 */
	bundle: {
		create: authOrAnonProcedure
			.input(
				z
					.object({
						groupId: z.string().optional(), // Optional: create from a group
						calendarIds: z.array(z.string()).min(1).max(15).optional(), // Required if groupId not provided
						name: z.string().max(200).optional(),
						expiresAt: z.string().datetime().optional(),
						removeDuplicates: z.boolean().default(false),
					})
					.refine(
						(data) =>
							data.groupId || (data.calendarIds && data.calendarIds.length > 0),
						{
							message: "Either groupId or calendarIds must be provided",
							path: ["calendarIds"],
						},
					),
			)
			.mutation(async ({ ctx, input }) => {
				// Get calendar IDs from group or input
				const calendarIds = await getCalendarIdsForBundle(
					input.groupId,
					input.calendarIds,
					ctx,
				);

				// Verify the user owns all calendars
				const calendars = await prisma.calendar.findMany({
					where: {
						id: { in: calendarIds },
						...buildOwnershipFilter(ctx),
					},
				});

				if (calendars.length !== calendarIds.length) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "One or more calendars not found",
					});
				}

				// Check bundle limit per user
				await checkBundleLimit(ctx);

				// Generate unique token
				const token = generateShareToken();

				// Generate default name if not provided
				const defaultName = `${calendarIds.length} calendars - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
				const bundleName = input.name?.trim() || defaultName;

				// Create the bundle
				const bundle = await prisma.calendarShareBundle
					.create({
						data: {
							token,
							name: bundleName,
							groupId: input.groupId || null,
							expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
							removeDuplicates: input.removeDuplicates,
							calendars: {
								create: calendarIds.map((calendarId, index) => ({
									calendarId,
									order: index,
								})),
							},
						},
						include: {
							calendars: {
								include: {
									bundle: false,
								},
							},
						},
					})
					.catch((error) => {
						handlePrismaError(error);
						throw error; // Never reached, but TypeScript needs it
					});

				return {
					id: bundle.id,
					token: bundle.token,
					name: bundle.name,
					isActive: bundle.isActive,
					expiresAt: bundle.expiresAt,
					removeDuplicates: bundle.removeDuplicates,
					calendarCount: bundle.calendars.length,
					createdAt: bundle.createdAt,
				};
			}),

		/**
		 * List all share bundles for calendars owned by the user
		 */
		list: authOrAnonProcedure.query(async ({ ctx }) => {
			// Get all calendars owned by the user
			const userCalendars = await prisma.calendar.findMany({
				where: buildOwnershipFilter(ctx),
				select: { id: true },
			});

			const userCalendarIds = userCalendars.map((c) => c.id);

			// Find all bundles that contain at least one of the user's calendars
			const bundles = await prisma.calendarShareBundle.findMany({
				where: {
					calendars: {
						some: {
							calendarId: { in: userCalendarIds },
						},
					},
				},
				include: {
					calendars: {
						select: {
							calendarId: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
			});

			// Filter to only bundles where ALL calendars belong to the user
			const ownedBundles = bundles.filter((bundle) => {
				const bundleCalendarIds = bundle.calendars.map((c) => c.calendarId);
				return bundleCalendarIds.every((id) => userCalendarIds.includes(id));
			});

			return ownedBundles.map((bundle) => ({
				id: bundle.id,
				token: bundle.token,
				name: bundle.name,
				isActive: bundle.isActive,
				expiresAt: bundle.expiresAt,
				removeDuplicates: bundle.removeDuplicates,
				accessCount: bundle.accessCount,
				lastAccessedAt: bundle.lastAccessedAt,
				createdAt: bundle.createdAt,
				calendarCount: bundle.calendars.length,
			}));
		}),

		/**
		 * Update a share bundle
		 */
		update: authOrAnonProcedure
			.input(
				z.object({
					id: z.string(),
					name: z.string().max(200).optional(),
					isActive: z.boolean().optional(),
					expiresAt: z.string().datetime().nullable().optional(),
					removeDuplicates: z.boolean().optional(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				// Find the bundle
				const bundle = await prisma.calendarShareBundle.findUnique({
					where: { id: input.id },
					include: {
						calendars: {
							select: {
								calendarId: true,
							},
						},
					},
				});

				if (!bundle) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Share bundle not found",
					});
				}

				// Verify ownership via calendars
				const bundleCalendarIds = bundle.calendars.map((c) => c.calendarId);
				const userCalendars = await prisma.calendar.findMany({
					where: {
						id: { in: bundleCalendarIds },
						...buildOwnershipFilter(ctx),
					},
				});

				if (userCalendars.length !== bundleCalendarIds.length) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You do not have permission to update this bundle",
					});
				}

				// Update the bundle
				const updateData: {
					name?: string;
					isActive?: boolean;
					expiresAt?: Date | null;
					removeDuplicates?: boolean;
				} = {};

				if (input.name !== undefined) {
					const trimmedName = input.name.trim();
					updateData.name = trimmedName || undefined;
				}
				if (input.isActive !== undefined) {
					updateData.isActive = input.isActive;
				}
				if (input.expiresAt !== undefined) {
					updateData.expiresAt = input.expiresAt
						? new Date(input.expiresAt)
						: null;
				}
				if (input.removeDuplicates !== undefined) {
					updateData.removeDuplicates = input.removeDuplicates;
				}

				let updated: Awaited<
					ReturnType<typeof prisma.calendarShareBundle.update>
				>;
				try {
					updated = await prisma.calendarShareBundle.update({
						where: { id: input.id },
						data: updateData,
					});
				} catch (error) {
					handlePrismaError(error);
					throw error; // Never reached, but TypeScript needs it
				}

				return {
					id: updated.id,
					token: updated.token,
					name: updated.name,
					isActive: updated.isActive,
					expiresAt: updated.expiresAt,
					removeDuplicates: updated.removeDuplicates,
					createdAt: updated.createdAt,
				};
			}),

		/**
		 * Delete a share bundle
		 */
		delete: authOrAnonProcedure
			.input(z.object({ id: z.string() }))
			.mutation(async ({ ctx, input }) => {
				// Find the bundle
				const bundle = await prisma.calendarShareBundle.findUnique({
					where: { id: input.id },
					include: {
						calendars: {
							select: {
								calendarId: true,
							},
						},
					},
				});

				if (!bundle) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Share bundle not found",
					});
				}

				// Verify ownership
				const bundleCalendarIds = bundle.calendars.map((c) => c.calendarId);
				const userCalendars = await prisma.calendar.findMany({
					where: {
						id: { in: bundleCalendarIds },
						...buildOwnershipFilter(ctx),
					},
				});

				if (userCalendars.length !== bundleCalendarIds.length) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You do not have permission to delete this bundle",
					});
				}

				try {
					await prisma.calendarShareBundle.delete({
						where: { id: input.id },
					});
				} catch (error) {
					handlePrismaError(error);
					throw error; // Never reached, but TypeScript needs it
				}

				return { success: true };
			}),

		/**
		 * PUBLIC: Access a shared bundle by token
		 * Returns merged ICS content for download
		 */
		getByToken: publicProcedure
			.input(z.object({ token: z.string() }))
			.query(async ({ input }) => {
				// Find the bundle
				const bundle = await prisma.calendarShareBundle.findUnique({
					where: { token: input.token },
					include: {
						calendars: {
							orderBy: {
								order: "asc",
							},
						},
					},
				});

				if (!bundle) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Sharing bundle not found or expired",
					});
				}

				// Check if active
				if (!bundle.isActive) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "This share bundle has been disabled",
					});
				}

				// Check expiration
				if (bundle.expiresAt && bundle.expiresAt < new Date()) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "This share bundle has expired",
					});
				}

				// Get all calendars with events
				const calendarIds = bundle.calendars.map((c) => c.calendarId);
				const calendars = await prisma.calendar.findMany({
					where: { id: { in: calendarIds } },
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

				// Filter out deleted calendars
				const availableCalendars = calendars.filter((cal) => cal !== null);
				if (availableCalendars.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "This bundle is no longer available",
					});
				}

				// Update access stats (fire and forget)
				prisma.calendarShareBundle
					.update({
						where: { id: bundle.id },
						data: {
							accessCount: { increment: 1 },
							lastAccessedAt: new Date(),
						},
					})
					.catch((error) => {
						// Log error but don't fail the request (non-critical operation)
						logger.error("[Share Bundle] Failed to update access stats", error);
					});

				// Import the generator
				const { generateIcs } = await import("../lib/ics-generator");

				// Convert events to ICS format (same as single calendar)
				type CalendarEvent = (typeof calendars)[0]["events"][0];
				const convertEventToIcsFormat = (event: CalendarEvent) => {
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

				// Collect all events from all calendars
				let allEvents = availableCalendars.flatMap((cal) =>
					cal.events.map(convertEventToIcsFormat),
				);

				// Remove duplicates if requested
				let removedDuplicates = 0;
				if (bundle.removeDuplicates && allEvents.length > 0) {
					const { unique, duplicates } = deduplicateEvents(allEvents, {
						useUid: true,
						useTitle: true,
						dateTolerance: 60000, // 1 minute tolerance
					});
					removedDuplicates = duplicates.length;
					allEvents = unique;
				}

				// Validate file size (estimate: ~1.5KB per event)
				const estimatedSize = allEvents.length * 1.5 * 1024;
				if (estimatedSize > 4 * 1024 * 1024) {
					// Warn but continue - log for monitoring large bundle requests
					logger.warn(
						`[Share Bundle] Large bundle detected: ${allEvents.length} events, estimated ${(estimatedSize / 1024 / 1024).toFixed(2)}MB`,
					);
				}

				// Generate merged ICS
				const bundleName = bundle.name || "Shared Calendars";
				const icsContent = generateIcs({
					name: bundleName,
					events: allEvents,
				});

				// Validate actual size
				const actualSize = new Blob([icsContent]).size;
				if (actualSize > 5 * 1024 * 1024) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `Bundle too large (${(actualSize / 1024 / 1024).toFixed(2)}MB). Maximum allowed: 5MB. Please select fewer calendars or remove some events.`,
					});
				}

				return {
					icsContent,
					bundleName,
					eventCount: allEvents.length,
					calendarCount: availableCalendars.length,
					removedDuplicates,
					removedCalendars: calendarIds.length - availableCalendars.length,
				};
			}),

		/**
		 * PUBLIC: Get bundle info by token (without ICS content)
		 */
		getInfoByToken: publicProcedure
			.input(z.object({ token: z.string() }))
			.query(async ({ input }) => {
				// Find the bundle
				const bundle = await prisma.calendarShareBundle.findUnique({
					where: { token: input.token },
					include: {
						calendars: {
							orderBy: {
								order: "asc",
							},
						},
					},
				});

				if (!bundle) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Sharing bundle not found or expired",
					});
				}

				// Check if active
				if (!bundle.isActive) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "This share bundle has been disabled",
					});
				}

				// Check expiration
				if (bundle.expiresAt && bundle.expiresAt < new Date()) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "This share bundle has expired",
					});
				}

				// Get calendars info
				const calendarIds = bundle.calendars.map((c) => c.calendarId);
				const calendars = await prisma.calendar.findMany({
					where: { id: { in: calendarIds } },
					select: {
						id: true,
						name: true,
						color: true,
						_count: {
							select: { events: true },
						},
					},
				});

				const availableCalendars = calendars.filter((cal) => cal !== null);
				if (availableCalendars.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "This bundle is no longer available",
					});
				}

				const totalEvents = availableCalendars.reduce(
					(sum, cal) => sum + cal._count.events,
					0,
				);

				return {
					bundleName: bundle.name,
					calendarCount: availableCalendars.length,
					totalEvents,
					removeDuplicates: bundle.removeDuplicates,
					removedCalendars: calendarIds.length - availableCalendars.length,
					calendars: availableCalendars.map((cal) => ({
						id: cal.id,
						name: cal.name,
						color: cal.color,
						eventCount: cal._count.events,
					})),
				};
			}),
	},
});
