import {
	ANONYMOUS_LIMITS,
	AUTHENTICATED_LIMITS,
	getMaxCalendars,
	getMaxEventsPerCalendar,
	hasReachedCalendarLimit,
	hasReachedEventLimit,
} from "@calendraft/core";
import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import type { Context } from "./context";

/**
 * Build Prisma where clause for user ownership verification
 * Supports both authenticated and anonymous users
 */
export function buildOwnershipFilter(ctx: Context) {
	return {
		OR: [
			...(ctx.session?.user?.id ? [{ userId: ctx.session.user.id }] : []),
			...(ctx.anonymousId ? [{ userId: ctx.anonymousId }] : []),
		],
	};
}

/**
 * Check if user is anonymous (not authenticated)
 */
export function isAnonymousUser(ctx: Context): boolean {
	return !ctx.session?.user?.id && !!ctx.anonymousId;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticatedUser(ctx: Context): boolean {
	return !!ctx.session?.user?.id;
}

/**
 * Get error message for calendar limit based on user type
 */
function getCalendarLimitMessage(isAuth: boolean): string {
	if (isAuth) {
		return `Limit reached: you have reached the maximum of ${AUTHENTICATED_LIMITS.calendars} calendars. This generous limit helps keep the service free for everyone.`;
	}
	return `Limit reached: you can create a maximum of ${ANONYMOUS_LIMITS.calendars} calendars in anonymous mode. Create a free account to have up to ${AUTHENTICATED_LIMITS.calendars} calendars.`;
}

/**
 * Get error message for event limit based on user type
 */
function getEventLimitMessage(isAuth: boolean): string {
	if (isAuth) {
		return `Limit reached: you have reached the maximum of ${AUTHENTICATED_LIMITS.eventsPerCalendar} events per calendar. This generous limit helps keep the service free for everyone.`;
	}
	return `Limit reached: you can create a maximum of ${ANONYMOUS_LIMITS.eventsPerCalendar} events per calendar in anonymous mode. Create a free account to have up to ${AUTHENTICATED_LIMITS.eventsPerCalendar} events.`;
}

/**
 * Check calendar limit for user
 * Both authenticated and anonymous users have limits
 * Throws error if limit exceeded
 */
export async function checkCalendarLimit(ctx: Context): Promise<void> {
	const isAuth = isAuthenticatedUser(ctx);
	const userId = isAuth ? ctx.session?.user?.id : ctx.anonymousId;

	if (!userId) return;

	const calendarCount = await prisma.calendar.count({
		where: { userId },
	});

	if (hasReachedCalendarLimit(isAuth, calendarCount)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: getCalendarLimitMessage(isAuth),
		});
	}
}

/**
 * Check event limit for user in a calendar
 * Both authenticated and anonymous users have limits
 * Throws error if limit exceeded
 */
export async function checkEventLimit(
	ctx: Context,
	calendarId: string,
): Promise<void> {
	const isAuth = isAuthenticatedUser(ctx);
	const userId = isAuth ? ctx.session?.user?.id : ctx.anonymousId;

	if (!userId) return;

	// Verify calendar belongs to user and get event count
	const calendar = await prisma.calendar.findFirst({
		where: {
			id: calendarId,
			userId,
		},
		include: {
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

	if (hasReachedEventLimit(isAuth, calendar._count.events)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: getEventLimitMessage(isAuth),
		});
	}
}

/**
 * Get current usage stats for user (authenticated or anonymous)
 */
export async function getUserUsage(ctx: Context): Promise<{
	calendarCount: number;
	maxCalendars: number;
	eventCounts: Record<string, number>;
	maxEventsPerCalendar: number;
	isAuthenticated: boolean;
} | null> {
	const userId = ctx.session?.user?.id || ctx.anonymousId;
	if (!userId) {
		return null;
	}

	const isAuth = isAuthenticatedUser(ctx);

	const calendars = await prisma.calendar.findMany({
		where: { userId },
		include: {
			_count: {
				select: { events: true },
			},
		},
	});

	const eventCounts: Record<string, number> = {};
	for (const cal of calendars) {
		eventCounts[cal.id] = cal._count.events;
	}

	return {
		calendarCount: calendars.length,
		maxCalendars: getMaxCalendars(isAuth),
		eventCounts,
		maxEventsPerCalendar: getMaxEventsPerCalendar(isAuth),
		isAuthenticated: isAuth,
	};
}

/**
 * Verify calendar access with optimized single query
 * Returns the calendar if access is granted, throws TRPCError otherwise
 *
 * Access is granted if:
 * 1. User is the owner of the calendar (original owner)
 * 2. User is a member of a shared group that contains this calendar (authenticated users only)
 */
export async function verifyCalendarAccess(
	calendarId: string,
	ctx: Context,
): Promise<{ id: string; userId: string | null }> {
	const calendar = await prisma.calendar.findUnique({
		where: { id: calendarId },
		select: { id: true, userId: true },
	});

	if (!calendar) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Calendar not found",
		});
	}

	// 1. Verify ownership (original behavior)
	const ownershipFilter = buildOwnershipFilter(ctx);
	const isOwner =
		(ownershipFilter.OR?.some(
			(condition) =>
				"userId" in condition && condition.userId === calendar.userId,
		) ??
			false) ||
		calendar.userId === null;

	if (isOwner) {
		return calendar;
	}

	// 2. Check if calendar is in a shared group where user is a member (authenticated users only)
	if (ctx.session?.user?.id) {
		const groupMember = await prisma.calendarGroupMember.findFirst({
			where: {
				calendarId,
				group: {
					members: {
						some: {
							userId: ctx.session.user.id,
							acceptedAt: { not: null }, // Only accepted invitations
						},
					},
				},
			},
			select: {
				groupId: true,
			},
		});

		if (groupMember) {
			// User has access via group membership
			return calendar;
		}
	}

	// No access
	throw new TRPCError({
		code: "FORBIDDEN",
		message: "Access denied to this calendar",
	});
}
