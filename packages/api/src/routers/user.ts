import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../index";
import { getUserUsage } from "../middleware";
import { exportDataRateLimit } from "../middleware/rate-limit";

export const userRouter = router({
	/**
	 * Get current user's usage information
	 * Authenticated users have generous limits (100 calendars, 2000 events)
	 */
	getUsage: protectedProcedure.query(async ({ ctx }) => {
		const usage = await getUserUsage(ctx);
		if (!usage) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Unable to fetch usage statistics",
			});
		}

		return {
			isAuthenticated: usage.isAuthenticated,
			usage: {
				calendarCount: usage.calendarCount,
				maxCalendars: usage.maxCalendars,
				maxEventsPerCalendar: usage.maxEventsPerCalendar,
			},
		};
	}),

	/**
	 * Export all user data (RGPD - Right to Data Portability)
	 * Returns a JSON structure with all user's calendars, events, groups, and share links
	 */
	exportData: protectedProcedure
		.use(exportDataRateLimit)
		.query(async ({ ctx }) => {
			if (!ctx.session?.user?.id) {
				throw new TRPCError({
					code: "UNAUTHORIZED",
					message: "You must be authenticated to export your data",
				});
			}

			const userId = ctx.session.user.id;

			// Fetch user data
			const user = await prisma.user.findUnique({
				where: { id: userId },
				select: {
					id: true,
					name: true,
					email: true,
					emailVerified: true,
					image: true,
					createdAt: true,
					updatedAt: true,
				},
			});

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			// Fetch all calendars with events
			const calendars = await prisma.calendar.findMany({
				where: { userId },
				include: {
					events: {
						include: {
							attendees: true,
							alarms: true,
							categories: true,
							resources: true,
							recurrenceDates: true,
						},
						orderBy: {
							startDate: "asc",
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
			});

			// Fetch calendar groups
			const groups = await prisma.calendarGroup.findMany({
				where: { userId },
				include: {
					calendars: {
						orderBy: {
							order: "asc",
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
			});

			// Get calendar IDs for share links and bundles
			const calendarIds = calendars.map((cal) => cal.id);

			// Fetch share links for user's calendars
			const shareLinks = await prisma.calendarShareLink.findMany({
				where: {
					calendarId: { in: calendarIds },
				},
				orderBy: {
					createdAt: "asc",
				},
			});

			// Fetch share bundles where user owns all calendars
			// First, get all bundles that contain user's calendars
			const bundleCalendars = await prisma.shareBundleCalendar.findMany({
				where: {
					calendarId: { in: calendarIds },
				},
				include: {
					bundle: {
						include: {
							calendars: {
								include: {
									bundle: true,
								},
							},
						},
					},
				},
			});

			// Filter bundles where ALL calendars belong to the user
			const userBundles = bundleCalendars
				.map((bc) => bc.bundle)
				.filter((bundle, index, self) => {
					// Deduplicate by bundle ID
					return self.findIndex((b) => b.id === bundle.id) === index;
				})
				.filter((bundle) => {
					// Check if all calendars in bundle belong to user
					const allCalendarIds = bundle.calendars.map((c) => c.calendarId);
					return allCalendarIds.every((id) => calendarIds.includes(id));
				})
				.map((bundle) => ({
					id: bundle.id,
					token: bundle.token,
					name: bundle.name,
					groupId: bundle.groupId,
					isActive: bundle.isActive,
					expiresAt: bundle.expiresAt,
					removeDuplicates: bundle.removeDuplicates,
					accessCount: bundle.accessCount,
					lastAccessedAt: bundle.lastAccessedAt,
					createdAt: bundle.createdAt,
					updatedAt: bundle.updatedAt,
					calendars: bundle.calendars.map((c) => ({
						calendarId: c.calendarId,
						order: c.order,
					})),
				}));

			// Build export structure
			const exportData = {
				exportDate: new Date().toISOString(),
				version: "1.0",
				user: {
					id: user.id,
					name: user.name,
					email: user.email,
					emailVerified: user.emailVerified,
					image: user.image,
					createdAt: user.createdAt.toISOString(),
					updatedAt: user.updatedAt.toISOString(),
				},
				calendars: calendars.map((cal) => ({
					id: cal.id,
					name: cal.name,
					color: cal.color,
					sourceUrl: cal.sourceUrl,
					lastSyncedAt: cal.lastSyncedAt?.toISOString() ?? null,
					createdAt: cal.createdAt.toISOString(),
					updatedAt: cal.updatedAt.toISOString(),
					events: cal.events.map((event) => ({
						id: event.id,
						title: event.title,
						startDate: event.startDate.toISOString(),
						endDate: event.endDate.toISOString(),
						description: event.description,
						location: event.location,
						status: event.status,
						priority: event.priority,
						url: event.url,
						class: event.class,
						comment: event.comment,
						contact: event.contact,
						sequence: event.sequence,
						transp: event.transp,
						rrule: event.rrule,
						geoLatitude: event.geoLatitude,
						geoLongitude: event.geoLongitude,
						organizerName: event.organizerName,
						organizerEmail: event.organizerEmail,
						uid: event.uid,
						dtstamp: event.dtstamp?.toISOString() ?? null,
						created: event.created?.toISOString() ?? null,
						lastModified: event.lastModified?.toISOString() ?? null,
						recurrenceId: event.recurrenceId,
						relatedTo: event.relatedTo,
						color: event.color,
						attendees: event.attendees.map((a) => ({
							name: a.name,
							email: a.email,
							role: a.role,
							status: a.status,
							rsvp: a.rsvp,
						})),
						alarms: event.alarms.map((a) => ({
							trigger: a.trigger,
							action: a.action,
							summary: a.summary,
							description: a.description,
							duration: a.duration,
							repeat: a.repeat,
						})),
						categories: event.categories.map((c) => c.category),
						resources: event.resources.map((r) => r.resource),
						recurrenceDates: event.recurrenceDates.map((rd) => ({
							date: rd.date.toISOString(),
							type: rd.type,
						})),
						createdAt: event.createdAt.toISOString(),
						updatedAt: event.updatedAt.toISOString(),
					})),
				})),
				groups: groups.map((group) => ({
					id: group.id,
					name: group.name,
					description: group.description,
					color: group.color,
					createdAt: group.createdAt.toISOString(),
					updatedAt: group.updatedAt.toISOString(),
					calendars: group.calendars.map((c) => ({
						calendarId: c.calendarId,
						order: c.order,
					})),
				})),
				shareLinks: shareLinks.map((link) => ({
					id: link.id,
					calendarId: link.calendarId,
					token: link.token,
					name: link.name,
					isActive: link.isActive,
					expiresAt: link.expiresAt?.toISOString() ?? null,
					accessCount: link.accessCount,
					lastAccessedAt: link.lastAccessedAt?.toISOString() ?? null,
					createdAt: link.createdAt.toISOString(),
					updatedAt: link.updatedAt.toISOString(),
				})),
				shareBundles: userBundles,
			};

			return exportData;
		}),
});
