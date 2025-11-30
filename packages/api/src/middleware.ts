import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import type { Context } from "./context";

/**
 * Limits for anonymous users
 */
const ANONYMOUS_LIMITS = {
	MAX_CALENDARS: 5,
	MAX_EVENTS_PER_CALENDAR: 100,
} as const;

/**
 * Middleware to require authentication (either session or anonymous ID)
 */
export function requireAuth(ctx: Context) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "User ID required. Please authenticate or provide anonymous ID.",
		});
	}
	return ctx;
}

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
 * Check calendar limit for anonymous users
 * Throws error if limit exceeded
 */
export async function checkAnonymousCalendarLimit(ctx: Context): Promise<void> {
	if (!isAnonymousUser(ctx)) {
		return; // No limit for authenticated users
	}

	const calendarCount = await prisma.calendar.count({
		where: {
			userId: ctx.anonymousId,
		},
	});

	if (calendarCount >= ANONYMOUS_LIMITS.MAX_CALENDARS) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limite atteinte : les utilisateurs anonymes peuvent créer maximum ${ANONYMOUS_LIMITS.MAX_CALENDARS} calendriers. Créez un compte pour créer plus de calendriers.`,
		});
	}
}

/**
 * Check event limit for anonymous users in a calendar
 * Throws error if limit exceeded
 */
export async function checkAnonymousEventLimit(
	ctx: Context,
	calendarId: string,
): Promise<void> {
	if (!isAnonymousUser(ctx)) {
		return; // No limit for authenticated users
	}

	// Verify calendar belongs to user
	const calendar = await prisma.calendar.findFirst({
		where: {
			id: calendarId,
			userId: ctx.anonymousId,
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

	if (calendar._count.events >= ANONYMOUS_LIMITS.MAX_EVENTS_PER_CALENDAR) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limite atteinte : les utilisateurs anonymes peuvent créer maximum ${ANONYMOUS_LIMITS.MAX_EVENTS_PER_CALENDAR} événements par calendrier. Créez un compte pour créer plus d'événements.`,
		});
	}
}

/**
 * Get current usage stats for anonymous users
 * Returns null for authenticated users
 */
export async function getAnonymousUsage(ctx: Context): Promise<{
	calendarCount: number;
	maxCalendars: number;
	eventCounts: Record<string, number>;
	maxEventsPerCalendar: number;
} | null> {
	if (!isAnonymousUser(ctx)) {
		return null;
	}

	const calendars = await prisma.calendar.findMany({
		where: {
			userId: ctx.anonymousId,
		},
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
		maxCalendars: ANONYMOUS_LIMITS.MAX_CALENDARS,
		eventCounts,
		maxEventsPerCalendar: ANONYMOUS_LIMITS.MAX_EVENTS_PER_CALENDAR,
	};
}
