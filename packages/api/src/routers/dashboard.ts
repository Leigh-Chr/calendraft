import prisma from "@calendraft/db";
import {
	addDays,
	addMonths,
	addWeeks,
	addYears,
	differenceInMinutes,
	endOfDay,
	endOfMonth,
	endOfWeek,
	endOfYear,
	format,
	isToday,
	isTomorrow,
	startOfDay,
	startOfMonth,
	startOfWeek,
	startOfYear,
	subMonths,
} from "date-fns";
import { z } from "zod";
import { authOrAnonProcedure, router } from "../index";
import { isAuthenticatedUser } from "../middleware";

// Period calculation helpers
function getPeriodDates(period: string, now: Date) {
	switch (period) {
		case "today":
			return {
				start: startOfDay(now),
				end: endOfDay(now),
				previousStart: startOfDay(addDays(now, -1)),
				previousEnd: endOfDay(addDays(now, -1)),
			};
		case "week":
			return {
				start: startOfWeek(now, { weekStartsOn: 1 }),
				end: endOfWeek(now, { weekStartsOn: 1 }),
				previousStart: startOfWeek(addWeeks(now, -1), { weekStartsOn: 1 }),
				previousEnd: endOfWeek(addWeeks(now, -1), { weekStartsOn: 1 }),
			};
		case "month":
			return {
				start: startOfMonth(now),
				end: endOfMonth(now),
				previousStart: startOfMonth(addMonths(now, -1)),
				previousEnd: endOfMonth(addMonths(now, -1)),
			};
		case "year":
			return {
				start: startOfYear(now),
				end: endOfYear(now),
				previousStart: startOfYear(addYears(now, -1)),
				previousEnd: endOfYear(addYears(now, -1)),
			};
		default:
			return {
				start: startOfWeek(now, { weekStartsOn: 1 }),
				end: endOfWeek(now, { weekStartsOn: 1 }),
				previousStart: startOfWeek(addWeeks(now, -1), { weekStartsOn: 1 }),
				previousEnd: endOfWeek(addWeeks(now, -1), { weekStartsOn: 1 }),
			};
	}
}

// Calculate event duration in hours
function getEventDurationHours(startDate: Date, endDate: Date): number {
	return differenceInMinutes(endDate, startDate) / 60;
}

// Check if an event is an all-day event
function isAllDayEvent(startDate: Date, endDate: Date): boolean {
	const durationHours = getEventDurationHours(startDate, endDate);
	const startMidnight =
		startDate.getHours() === 0 && startDate.getMinutes() === 0;
	const endMidnight = endDate.getHours() === 0 && endDate.getMinutes() === 0;
	return startMidnight && endMidnight && durationHours >= 24;
}

// Get day label for upcoming events
function getDayLabel(date: Date): string {
	if (isToday(date)) return "Today";
	if (isTomorrow(date)) return "Tomorrow";
	return format(date, "EEEE d MMMM");
}

// Note: This query function has high cognitive complexity (101) due to the
// comprehensive nature of dashboard analytics. It aggregates data from multiple
// sources and performs various calculations. The complexity is acceptable here
// as the function is well-structured with clear sections and the alternative
// would be to split into many smaller functions which would reduce readability.
export const dashboardRouter = router({
	getStats: authOrAnonProcedure
		.input(
			z.object({
				period: z.enum(["today", "week", "month", "year"]).default("week"),
			}),
		)
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Dashboard query aggregates multiple data sources
		.query(async ({ ctx, input }) => {
			const userId = ctx.userId;
			const now = new Date();
			const periodDates = getPeriodDates(input.period, now);

			// Get user's calendars
			const userCalendars = await prisma.calendar.findMany({
				where: { userId },
				select: {
					id: true,
					name: true,
					color: true,
				},
			});

			const calendarIds = userCalendars.map((c) => c.id);

			if (calendarIds.length === 0) {
				// Return empty state for users with no calendars
				return {
					period: {
						start: periodDates.start,
						end: periodDates.end,
						label: input.period,
					},
					hero: {
						eventsToday: 0,
						eventsPeriod: 0,
						eventsPreviousPeriod: 0,
						hoursOccupied: 0,
						hoursPreviousPeriod: 0,
						avgDuration: 0,
						nextEvent: null,
						pendingInvitations: 0,
					},
					upcoming: [],
					conflicts: [],
					timeLoad: {
						hoursOccupied: 0,
						hoursAvailable: 40,
						percentageOccupied: 0,
						heatmap: [],
					},
					breakdown: {
						byCategory: [],
						byCalendar: [],
						hasCategories: false,
					},
					insights: {
						recurrence: {
							totalRecurring: 0,
							totalEvents: 0,
							percentage: 0,
							byFrequency: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
						},
						alarms: {
							eventsWithAlarms: 0,
							totalEvents: 0,
							percentage: 0,
							mostCommonTrigger: null,
						},
						collaboration: {
							eventsWithAttendees: 0,
							uniqueContacts: 0,
							topContacts: [],
							rsvpStatus: {
								needsAction: 0,
								accepted: 0,
								declined: 0,
								tentative: 0,
							},
						},
						eventStatus: {
							confirmed: 0,
							tentative: 0,
							cancelled: 0,
						},
					},
					calendars: [],
					health: {
						eventsWithoutTitle: 0,
						eventsWithoutDescription: 0,
						tentativeEvents: 0,
						cancelledEvents: 0,
						oldEvents: 0,
						emptyCalendars: 0,
						potentialDuplicates: 0,
						expiredShareLinks: 0,
					},
					sharing: {
						activeLinks: 0,
						linkAccessThisMonth: 0,
						activeBundles: 0,
						bundleAccessThisMonth: 0,
						sharedGroups: 0,
						groupMembers: 0,
						pendingInvitations: 0,
					},
				};
			}

			// ===== HERO METRICS =====
			// Events today
			const todayStart = startOfDay(now);
			const todayEnd = endOfDay(now);
			const eventsToday = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: todayEnd },
					endDate: { gte: todayStart },
				},
			});

			// Events this period
			const eventsPeriod = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: periodDates.end },
					endDate: { gte: periodDates.start },
				},
			});

			// Events previous period
			const eventsPreviousPeriod = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: periodDates.previousEnd },
					endDate: { gte: periodDates.previousStart },
				},
			});

			// Hours occupied this period (OPAQUE events only)
			const eventsForDuration = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: periodDates.end },
					endDate: { gte: periodDates.start },
					OR: [{ transp: null }, { transp: "OPAQUE" }],
				},
				select: { startDate: true, endDate: true },
			});

			const hoursOccupied = eventsForDuration.reduce((sum, e) => {
				return sum + getEventDurationHours(e.startDate, e.endDate);
			}, 0);

			// Average event duration
			const avgDuration =
				eventsForDuration.length > 0
					? hoursOccupied / eventsForDuration.length
					: 0;

			// Hours previous period
			const eventsPrevDuration = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: periodDates.previousEnd },
					endDate: { gte: periodDates.previousStart },
					OR: [{ transp: null }, { transp: "OPAQUE" }],
				},
				select: { startDate: true, endDate: true },
			});

			const hoursPreviousPeriod = eventsPrevDuration.reduce((sum, e) => {
				return sum + getEventDurationHours(e.startDate, e.endDate);
			}, 0);

			// Next event
			const nextEventData = await prisma.event.findFirst({
				where: {
					calendarId: { in: calendarIds },
					startDate: { gt: now },
				},
				orderBy: { startDate: "asc" },
				include: {
					calendar: { select: { name: true, color: true } },
				},
			});

			const nextEvent = nextEventData
				? {
						id: nextEventData.id,
						title: nextEventData.title,
						startDate: nextEventData.startDate,
						calendarName: nextEventData.calendar.name,
						calendarColor: nextEventData.calendar.color,
					}
				: null;

			// Pending invitations (NEEDS_ACTION)
			const pendingInvitationsCount = await prisma.eventAttendee.count({
				where: {
					event: { calendarId: { in: calendarIds } },
					status: "NEEDS_ACTION",
				},
			});

			// ===== UPCOMING 7 DAYS =====
			const upcomingEnd = addDays(now, 7);
			const upcomingEvents = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: upcomingEnd },
					endDate: { gte: todayStart },
				},
				select: {
					id: true,
					title: true,
					startDate: true,
					endDate: true,
					location: true,
					rrule: true,
					status: true,
					priority: true,
					calendar: { select: { id: true, name: true, color: true } },
					attendees: { select: { id: true } },
				},
				orderBy: { startDate: "asc" },
			});

			// Group events by date
			const eventsByDate = new Map<
				string,
				{
					date: string;
					dayLabel: string;
					events: Array<{
						id: string;
						title: string;
						startDate: Date;
						endDate: Date;
						isAllDay: boolean;
						calendarId: string;
						calendarName: string;
						calendarColor: string | null;
						location: string | null;
						hasAttendees: boolean;
						attendeeCount: number;
						isRecurring: boolean;
						status: string | null;
						priority: number | null;
						conflictsWith: string[];
					}>;
				}
			>();

			for (const event of upcomingEvents) {
				const dateKey = format(event.startDate, "yyyy-MM-dd");
				if (!eventsByDate.has(dateKey)) {
					eventsByDate.set(dateKey, {
						date: dateKey,
						dayLabel: getDayLabel(event.startDate),
						events: [],
					});
				}

				const dayData = eventsByDate.get(dateKey);
				if (!dayData) continue;
				dayData.events.push({
					id: event.id,
					title: event.title,
					startDate: event.startDate,
					endDate: event.endDate,
					isAllDay: isAllDayEvent(event.startDate, event.endDate),
					calendarId: event.calendar.id,
					calendarName: event.calendar.name,
					calendarColor: event.calendar.color,
					location: event.location,
					hasAttendees: event.attendees.length > 0,
					attendeeCount: event.attendees.length,
					isRecurring: !!event.rrule,
					status: event.status,
					priority: event.priority,
					conflictsWith: [], // Will be filled below
				});
			}

			const upcoming = Array.from(eventsByDate.values()).sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);

			// ===== CONFLICTS DETECTION =====
			// Find overlapping OPAQUE events in the next 30 days
			const conflictWindow = addDays(now, 30);
			const opaqueEvents = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { gte: now, lte: conflictWindow },
					OR: [{ transp: null }, { transp: "OPAQUE" }],
				},
				select: { id: true, title: true, startDate: true, endDate: true },
				orderBy: { startDate: "asc" },
			});

			const conflicts: Array<{
				event1: { id: string; title: string; startDate: Date; endDate: Date };
				event2: { id: string; title: string; startDate: Date; endDate: Date };
			}> = [];

			for (let i = 0; i < opaqueEvents.length; i++) {
				for (let j = i + 1; j < opaqueEvents.length; j++) {
					const e1 = opaqueEvents[i];
					const e2 = opaqueEvents[j];
					if (!e1 || !e2) continue;
					// Check for overlap: e1.start < e2.end AND e2.start < e1.end
					if (e1.startDate < e2.endDate && e2.startDate < e1.endDate) {
						conflicts.push({
							event1: e1,
							event2: e2,
						});
						// Update conflictsWith in upcoming
						for (const day of upcoming) {
							for (const ev of day.events) {
								if (ev.id === e1.id) ev.conflictsWith.push(e2.id);
								if (ev.id === e2.id) ev.conflictsWith.push(e1.id);
							}
						}
					}
				}
				if (conflicts.length >= 10) break; // Limit to 10 conflicts
			}

			// ===== TIME LOAD =====
			const hoursAvailable = input.period === "today" ? 8 : 40; // Assuming 8h/day or 40h/week
			const percentageOccupied =
				hoursAvailable > 0
					? Math.min(100, Math.round((hoursOccupied / hoursAvailable) * 100))
					: 0;

			// Heatmap: aggregate last 4 weeks
			const heatmapStart = addWeeks(now, -4);
			const heatmapEvents = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { gte: heatmapStart, lte: now },
					OR: [{ transp: null }, { transp: "OPAQUE" }],
				},
				select: { startDate: true, endDate: true },
			});

			const heatmapData = new Map<string, number>();
			for (const event of heatmapEvents) {
				const dayOfWeek = event.startDate.getDay(); // 0 = Sunday
				const hour = event.startDate.getHours();
				const hourSlot =
					hour < 10
						? "08-10"
						: hour < 12
							? "10-12"
							: hour < 14
								? "12-14"
								: hour < 17
									? "14-17"
									: "17-20";
				const key = `${dayOfWeek}-${hourSlot}`;
				const duration = getEventDurationHours(event.startDate, event.endDate);
				heatmapData.set(key, (heatmapData.get(key) || 0) + duration);
			}

			const heatmap = Array.from(heatmapData.entries()).map(([key, hours]) => {
				const [dayOfWeek, hourSlot] = key.split("-");
				return {
					dayOfWeek: Number.parseInt(dayOfWeek || "0", 10),
					hourSlot: hourSlot || "08-10",
					hours,
				};
			});

			// ===== BREAKDOWN =====
			// Get hours by category
			const eventsWithCategories = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: periodDates.end },
					endDate: { gte: periodDates.start },
				},
				include: {
					categories: { select: { category: true } },
				},
			});

			const categoryHours = new Map<string, number>();
			const categoryEventCounts = new Map<string, number>();
			let totalCategoryHours = 0;

			for (const event of eventsWithCategories) {
				const duration = getEventDurationHours(event.startDate, event.endDate);
				if (event.categories.length > 0) {
					for (const cat of event.categories) {
						categoryHours.set(
							cat.category,
							(categoryHours.get(cat.category) || 0) + duration,
						);
						categoryEventCounts.set(
							cat.category,
							(categoryEventCounts.get(cat.category) || 0) + 1,
						);
						totalCategoryHours += duration;
					}
				}
			}

			const byCategory = Array.from(categoryHours.entries())
				.map(([category, hours]) => ({
					category,
					hours: Math.round(hours * 10) / 10,
					eventCount: categoryEventCounts.get(category) || 0,
					percentage:
						totalCategoryHours > 0
							? Math.round((hours / totalCategoryHours) * 100)
							: 0,
				}))
				.sort((a, b) => b.hours - a.hours);

			// By calendar
			const calendarHours = new Map<string, number>();
			const calendarEventCounts = new Map<string, number>();

			for (const event of eventsForDuration) {
				// Find the calendar for this event
				const eventWithCal = await prisma.event.findUnique({
					where: { id: (event as { id?: string }).id || "" },
					select: { calendarId: true },
				});
				if (eventWithCal) {
					const duration = getEventDurationHours(
						event.startDate,
						event.endDate,
					);
					calendarHours.set(
						eventWithCal.calendarId,
						(calendarHours.get(eventWithCal.calendarId) || 0) + duration,
					);
					calendarEventCounts.set(
						eventWithCal.calendarId,
						(calendarEventCounts.get(eventWithCal.calendarId) || 0) + 1,
					);
				}
			}

			// Get all events in period with calendar info for breakdown
			const eventsInPeriodWithCal = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					startDate: { lte: periodDates.end },
					endDate: { gte: periodDates.start },
				},
				select: { calendarId: true, startDate: true, endDate: true },
			});

			const calHours = new Map<string, number>();
			const calCounts = new Map<string, number>();
			let totalHours = 0;

			for (const event of eventsInPeriodWithCal) {
				const duration = getEventDurationHours(event.startDate, event.endDate);
				calHours.set(
					event.calendarId,
					(calHours.get(event.calendarId) || 0) + duration,
				);
				calCounts.set(
					event.calendarId,
					(calCounts.get(event.calendarId) || 0) + 1,
				);
				totalHours += duration;
			}

			const byCalendar = userCalendars
				.map((cal) => ({
					calendarId: cal.id,
					calendarName: cal.name,
					calendarColor: cal.color,
					hours: Math.round((calHours.get(cal.id) || 0) * 10) / 10,
					eventCount: calCounts.get(cal.id) || 0,
					percentage:
						totalHours > 0
							? Math.round(((calHours.get(cal.id) || 0) / totalHours) * 100)
							: 0,
				}))
				.sort((a, b) => b.hours - a.hours);

			// ===== INSIGHTS =====
			// Recurrence
			const totalEventsCount = await prisma.event.count({
				where: { calendarId: { in: calendarIds } },
			});

			const recurringEvents = await prisma.event.findMany({
				where: {
					calendarId: { in: calendarIds },
					rrule: { not: null },
				},
				select: { rrule: true },
			});

			const recurrenceByFreq = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
			for (const event of recurringEvents) {
				if (event.rrule?.includes("FREQ=DAILY")) recurrenceByFreq.daily++;
				else if (event.rrule?.includes("FREQ=WEEKLY"))
					recurrenceByFreq.weekly++;
				else if (event.rrule?.includes("FREQ=MONTHLY"))
					recurrenceByFreq.monthly++;
				else if (event.rrule?.includes("FREQ=YEARLY"))
					recurrenceByFreq.yearly++;
			}

			// Event Status breakdown
			const statusCounts = await prisma.event.groupBy({
				by: ["status"],
				where: {
					calendarId: { in: calendarIds },
					status: { not: null },
				},
				_count: { status: true },
			});

			const eventStatus = {
				confirmed:
					statusCounts.find((s) => s.status === "CONFIRMED")?._count.status ||
					0,
				tentative:
					statusCounts.find((s) => s.status === "TENTATIVE")?._count.status ||
					0,
				cancelled:
					statusCounts.find((s) => s.status === "CANCELLED")?._count.status ||
					0,
			};

			// Alarms
			const eventsWithAlarmsCount = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					alarms: { some: {} },
				},
			});

			const alarmTriggers = await prisma.eventAlarm.groupBy({
				by: ["trigger"],
				where: {
					event: { calendarId: { in: calendarIds } },
				},
				_count: { trigger: true },
				orderBy: { _count: { trigger: "desc" } },
				take: 1,
			});

			// Collaboration
			const eventsWithAttendeesCount = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					attendees: { some: {} },
				},
			});

			const topContacts = await prisma.eventAttendee.groupBy({
				by: ["email"],
				where: {
					event: { calendarId: { in: calendarIds } },
				},
				_count: { email: true },
				orderBy: { _count: { email: "desc" } },
				take: 3,
			});

			const uniqueContacts = await prisma.eventAttendee.findMany({
				where: { event: { calendarId: { in: calendarIds } } },
				select: { email: true },
				distinct: ["email"],
			});

			// RSVP Status breakdown
			const rsvpStatusCounts = await prisma.eventAttendee.groupBy({
				by: ["status"],
				where: {
					event: { calendarId: { in: calendarIds } },
					status: { not: null },
				},
				_count: { status: true },
			});

			const rsvpStatus = {
				needsAction:
					rsvpStatusCounts.find((s) => s.status === "NEEDS_ACTION")?._count
						.status || 0,
				accepted:
					rsvpStatusCounts.find((s) => s.status === "ACCEPTED")?._count
						.status || 0,
				declined:
					rsvpStatusCounts.find((s) => s.status === "DECLINED")?._count
						.status || 0,
				tentative:
					rsvpStatusCounts.find((s) => s.status === "TENTATIVE")?._count
						.status || 0,
			};

			// ===== CALENDARS =====
			const calendarsWithStats = await Promise.all(
				userCalendars.map(async (cal) => {
					const eventCount = await prisma.event.count({
						where: { calendarId: cal.id },
					});
					const eventsThisPeriod = await prisma.event.count({
						where: {
							calendarId: cal.id,
							startDate: { lte: periodDates.end },
							endDate: { gte: periodDates.start },
						},
					});
					return {
						id: cal.id,
						name: cal.name,
						color: cal.color,
						eventCount,
						eventsThisPeriod,
					};
				}),
			);

			// ===== HEALTH =====
			const eventsWithoutTitle = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					title: "",
				},
			});

			const eventsWithoutDescription = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					OR: [{ description: null }, { description: "" }],
				},
			});

			const tentativeEvents = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					status: "TENTATIVE",
				},
			});

			const cancelledEvents = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					status: "CANCELLED",
				},
			});

			const sixMonthsAgo = subMonths(now, 6);
			const oldEvents = await prisma.event.count({
				where: {
					calendarId: { in: calendarIds },
					endDate: { lt: sixMonthsAgo },
				},
			});

			const emptyCalendars = await prisma.calendar.count({
				where: {
					id: { in: calendarIds },
					events: { none: {} },
				},
			});

			// Potential duplicates (same title + same day)
			const potentialDuplicatesResult = await prisma.$queryRaw<
				{ count: bigint }[]
			>`
				SELECT COUNT(*) as count FROM (
					SELECT e1.id
					FROM event e1
					JOIN event e2 ON e1.id < e2.id
					WHERE e1."calendarId" = ANY(${calendarIds})
					AND e2."calendarId" = ANY(${calendarIds})
					AND e1.title = e2.title
					AND DATE(e1."startDate") = DATE(e2."startDate")
					AND e1.title != ''
					LIMIT 100
				) as duplicates
			`;
			const potentialDuplicates = Number(
				potentialDuplicatesResult[0]?.count || 0,
			);

			const expiredShareLinks = await prisma.calendarShareLink.count({
				where: {
					calendarId: { in: calendarIds },
					expiresAt: { lt: now },
					isActive: true,
				},
			});

			// ===== SHARING =====
			const activeLinks = await prisma.calendarShareLink.count({
				where: {
					calendarId: { in: calendarIds },
					isActive: true,
					OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
				},
			});

			const monthStart = startOfMonth(now);
			const linkAccessThisMonth = await prisma.calendarShareLink.aggregate({
				where: {
					calendarId: { in: calendarIds },
					lastAccessedAt: { gte: monthStart },
				},
				_sum: { accessCount: true },
			});

			const activeBundles = await prisma.calendarShareBundle.count({
				where: {
					calendars: { some: { calendarId: { in: calendarIds } } },
					isActive: true,
					OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
				},
			});

			const bundleAccessThisMonth = await prisma.calendarShareBundle.aggregate({
				where: {
					calendars: { some: { calendarId: { in: calendarIds } } },
					lastAccessedAt: { gte: monthStart },
				},
				_sum: { accessCount: true },
			});

			// Group stats (only for authenticated users)
			let sharedGroups = 0;
			let groupMembers = 0;
			let pendingInvitations = 0;

			if (isAuthenticatedUser(ctx) && ctx.session?.user?.id) {
				sharedGroups = await prisma.calendarGroup.count({
					where: {
						members: {
							some: {
								userId: ctx.session.user.id,
								acceptedAt: { not: null },
							},
						},
					},
				});

				const userGroups = await prisma.calendarGroup.findMany({
					where: { userId },
					include: {
						members: { where: { acceptedAt: { not: null } } },
					},
				});

				groupMembers = userGroups.reduce((sum, g) => sum + g.members.length, 0);

				pendingInvitations = await prisma.groupMember.count({
					where: {
						userId: ctx.session.user.id,
						acceptedAt: null,
					},
				});
			}

			return {
				period: {
					start: periodDates.start,
					end: periodDates.end,
					label: input.period,
				},
				hero: {
					eventsToday,
					eventsPeriod,
					eventsPreviousPeriod,
					hoursOccupied: Math.round(hoursOccupied * 10) / 10,
					hoursPreviousPeriod: Math.round(hoursPreviousPeriod * 10) / 10,
					avgDuration: Math.round(avgDuration * 10) / 10,
					nextEvent,
					pendingInvitations: pendingInvitationsCount,
				},
				upcoming,
				conflicts,
				timeLoad: {
					hoursOccupied: Math.round(hoursOccupied * 10) / 10,
					hoursAvailable,
					percentageOccupied,
					heatmap,
				},
				breakdown: {
					byCategory,
					byCalendar,
					hasCategories: byCategory.length > 0,
				},
				insights: {
					recurrence: {
						totalRecurring: recurringEvents.length,
						totalEvents: totalEventsCount,
						percentage:
							totalEventsCount > 0
								? Math.round((recurringEvents.length / totalEventsCount) * 100)
								: 0,
						byFrequency: recurrenceByFreq,
					},
					alarms: {
						eventsWithAlarms: eventsWithAlarmsCount,
						totalEvents: totalEventsCount,
						percentage:
							totalEventsCount > 0
								? Math.round((eventsWithAlarmsCount / totalEventsCount) * 100)
								: 0,
						mostCommonTrigger: alarmTriggers[0]?.trigger || null,
					},
					collaboration: {
						eventsWithAttendees: eventsWithAttendeesCount,
						uniqueContacts: uniqueContacts.length,
						topContacts: topContacts.map((c) => ({
							email: c.email,
							count: c._count.email,
						})),
						rsvpStatus,
					},
					eventStatus,
				},
				calendars: calendarsWithStats,
				health: {
					eventsWithoutTitle,
					eventsWithoutDescription,
					tentativeEvents,
					cancelledEvents,
					oldEvents,
					emptyCalendars,
					potentialDuplicates,
					expiredShareLinks,
				},
				sharing: {
					activeLinks,
					linkAccessThisMonth: linkAccessThisMonth._sum.accessCount || 0,
					activeBundles,
					bundleAccessThisMonth: bundleAccessThisMonth._sum.accessCount || 0,
					sharedGroups,
					groupMembers,
					pendingInvitations,
				},
			};
		}),
});
