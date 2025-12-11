/**
 * Event access verification utilities
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import type { Context } from "../../context";
import { buildOwnershipFilter } from "../../middleware";

/**
 * Verify event access and ownership
 */
export async function verifyEventAccess(
	eventId: string,
	sessionUserId?: string,
	anonymousId?: string,
): Promise<{
	id: string;
	calendarId: string;
	calendar: { userId: string | null };
}> {
	const event = await prisma.event.findUnique({
		where: { id: eventId },
		select: {
			id: true,
			calendarId: true,
			calendar: { select: { userId: true } },
		},
	});

	if (!event) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Event not found",
		});
	}

	// Verify ownership in memory
	const hasAccess =
		(sessionUserId && event.calendar.userId === sessionUserId) ||
		(anonymousId && event.calendar.userId === anonymousId) ||
		event.calendar.userId === null;

	if (!hasAccess) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Access denied to this event",
		});
	}

	return event;
}

/**
 * Verify calendar access and ownership
 */
export async function verifyCalendarAccess(
	calendarId: string,
	sessionUserId?: string,
	anonymousId?: string,
) {
	// Single query to check existence
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

	// Verify ownership in memory
	const hasAccess =
		(sessionUserId && calendar.userId === sessionUserId) ||
		(anonymousId && calendar.userId === anonymousId) ||
		calendar.userId === null;

	if (!hasAccess) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Access denied to this calendar",
		});
	}

	return calendar;
}

/**
 * Verify calendar access and ownership for list queries
 */
export async function verifyCalendarAccessForList(
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

	// Verify ownership in a single check
	const ownershipFilter = buildOwnershipFilter(ctx);
	const hasAccess =
		(ownershipFilter.OR?.some(
			(condition) =>
				"userId" in condition && condition.userId === calendar.userId,
		) ??
			false) ||
		calendar.userId === null;

	if (!hasAccess) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Access denied to this calendar",
		});
	}

	return calendar;
}
