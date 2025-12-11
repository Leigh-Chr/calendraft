/**
 * Event validation utilities
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";

/**
 * Validate UID uniqueness if being changed
 */
export async function validateUidChange(
	newUid: string | null | undefined,
	currentUid: string | null,
	calendarId: string,
	eventId: string,
): Promise<void> {
	if (!newUid || newUid === currentUid) {
		return; // No change or no UID provided
	}

	// Check if UID already exists in this calendar
	const existing = await prisma.event.findFirst({
		where: {
			uid: newUid,
			calendarId,
			id: { not: eventId },
		},
		select: { id: true },
	});

	if (existing) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "An event with this UID already exists in this calendar",
		});
	}
}

/**
 * Validate RELATED-TO reference if being changed
 */
export async function validateRelatedToChange(
	newRelatedTo: string | null | undefined,
	calendarId: string,
	eventId: string,
): Promise<void> {
	if (!newRelatedTo) {
		return; // No related event
	}

	// Check if related event exists in this calendar
	const relatedEvent = await prisma.event.findFirst({
		where: {
			uid: newRelatedTo,
			calendarId,
		},
		select: { id: true },
	});

	if (!relatedEvent) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The related event (RELATED-TO) does not exist in this calendar",
		});
	}
	if (relatedEvent.id === eventId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "An event cannot be related to itself",
		});
	}
}
