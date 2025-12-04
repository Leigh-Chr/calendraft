import {
	ANONYMOUS_LIMITS,
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
 * Check calendar limit for user
 * Authenticated users have no limits, anonymous users have ANONYMOUS_LIMITS
 * Throws error if limit exceeded
 */
export async function checkCalendarLimit(ctx: Context): Promise<void> {
	const isAuth = isAuthenticatedUser(ctx);

	// Authenticated users have no limits
	if (isAuth) return;

	const userId = ctx.anonymousId;
	if (!userId) return;

	const calendarCount = await prisma.calendar.count({
		where: { userId },
	});

	if (hasReachedCalendarLimit(isAuth, calendarCount)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limite atteinte : vous pouvez créer maximum ${ANONYMOUS_LIMITS.calendars} calendriers en mode anonyme. Créez un compte gratuit pour des calendriers illimités.`,
		});
	}
}

/**
 * Check event limit for user in a calendar
 * Authenticated users have no limits, anonymous users have ANONYMOUS_LIMITS
 * Throws error if limit exceeded
 */
export async function checkEventLimit(
	ctx: Context,
	calendarId: string,
): Promise<void> {
	const isAuth = isAuthenticatedUser(ctx);

	// Authenticated users have no limits
	if (isAuth) return;

	const userId = ctx.anonymousId;
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
			message: "Calendrier non trouvé",
		});
	}

	if (hasReachedEventLimit(isAuth, calendar._count.events)) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limite atteinte : vous pouvez créer maximum ${ANONYMOUS_LIMITS.eventsPerCalendar} événements par calendrier en mode anonyme. Créez un compte gratuit pour des événements illimités.`,
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

// Legacy aliases for backward compatibility during migration
export const checkAnonymousCalendarLimit = checkCalendarLimit;
export const checkAnonymousEventLimit = checkEventLimit;
export const getAnonymousUsage = getUserUsage;
