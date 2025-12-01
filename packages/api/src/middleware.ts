import {
	getDefaultPlanType,
	getPlanLimits,
	type PlanType,
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
 * Check if a subscription is currently valid (active or in grace period)
 */
function isSubscriptionValid(subscription: {
	status: string;
	cancelAtPeriodEnd: boolean;
	currentPeriodEnd: Date | null;
}): boolean {
	// Active or trialing subscriptions are valid
	if (subscription.status === "ACTIVE" || subscription.status === "TRIALING") {
		return true;
	}
	// Canceled subscriptions are valid until the end of the period
	if (
		subscription.status === "CANCELED" &&
		subscription.cancelAtPeriodEnd &&
		subscription.currentPeriodEnd &&
		new Date(subscription.currentPeriodEnd) > new Date()
	) {
		return true;
	}
	return false;
}

/**
 * Get user's plan type
 * Returns FREE for anonymous users, or the plan from subscription for authenticated users
 * Takes into account subscription status - only ACTIVE and TRIALING subscriptions count
 */
export async function getUserPlanType(ctx: Context): Promise<PlanType> {
	if (!ctx.session?.user?.id) {
		return getDefaultPlanType();
	}

	const subscription = await prisma.subscription.findUnique({
		where: { userId: ctx.session.user.id },
		select: {
			planType: true,
			status: true,
			currentPeriodEnd: true,
			cancelAtPeriodEnd: true,
		},
	});

	if (!subscription || !isSubscriptionValid(subscription)) {
		return getDefaultPlanType();
	}

	return (subscription.planType as PlanType) || getDefaultPlanType();
}

/**
 * Check calendar limit based on user's plan
 * Throws error if limit exceeded
 */
export async function checkAnonymousCalendarLimit(ctx: Context): Promise<void> {
	const planType = await getUserPlanType(ctx);
	const limits = getPlanLimits(planType);

	const userId = ctx.session?.user?.id || ctx.anonymousId;
	if (!userId) {
		return;
	}

	const calendarCount = await prisma.calendar.count({
		where: {
			userId,
		},
	});

	if (
		calendarCount >= limits.calendars &&
		limits.calendars !== Number.POSITIVE_INFINITY
	) {
		const limitText = limits.calendars.toString();
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limite atteinte : vous pouvez créer maximum ${limitText} calendrier${limits.calendars === 1 ? "" : "s"} avec votre plan actuel. Passez à un plan supérieur pour créer plus de calendriers.`,
		});
	}
}

/**
 * Check event limit based on user's plan in a calendar
 * Throws error if limit exceeded
 */
export async function checkAnonymousEventLimit(
	ctx: Context,
	calendarId: string,
): Promise<void> {
	const planType = await getUserPlanType(ctx);
	const limits = getPlanLimits(planType);

	const userId = ctx.session?.user?.id || ctx.anonymousId;
	if (!userId) {
		return;
	}

	// Verify calendar belongs to user
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

	if (
		calendar._count.events >= limits.eventsPerCalendar &&
		limits.eventsPerCalendar !== Number.POSITIVE_INFINITY
	) {
		const limitText = limits.eventsPerCalendar.toString();
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `Limite atteinte : vous pouvez créer maximum ${limitText} événement${limits.eventsPerCalendar === 1 ? "" : "s"} par calendrier avec votre plan actuel. Passez à un plan supérieur pour créer plus d'événements.`,
		});
	}
}

/**
 * Get current usage stats for user (authenticated or anonymous)
 */
export async function getAnonymousUsage(ctx: Context): Promise<{
	calendarCount: number;
	maxCalendars: number;
	eventCounts: Record<string, number>;
	maxEventsPerCalendar: number;
	planType: PlanType;
} | null> {
	const userId = ctx.session?.user?.id || ctx.anonymousId;
	if (!userId) {
		return null;
	}

	const planType = await getUserPlanType(ctx);
	const limits = getPlanLimits(planType);

	const calendars = await prisma.calendar.findMany({
		where: {
			userId,
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
		maxCalendars:
			limits.calendars === Number.POSITIVE_INFINITY ? -1 : limits.calendars,
		eventCounts,
		maxEventsPerCalendar:
			limits.eventsPerCalendar === Number.POSITIVE_INFINITY
				? -1
				: limits.eventsPerCalendar,
		planType,
	};
}
