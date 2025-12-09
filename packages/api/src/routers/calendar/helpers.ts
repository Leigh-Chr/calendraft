/**
 * Helper functions for calendar operations
 * Extracted from calendar.ts for better maintainability
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import {
	parseAlarmAction,
	parseAttendeeRole,
	parseAttendeeStatus,
	parseEventClass,
	parseEventStatus,
	parseEventTransparency,
	prepareCategoriesData,
	prepareRecurrenceDatesData,
	prepareResourcesData,
} from "../../lib/event-helpers";
import type { ParsedEvent } from "../../lib/ics-parser";

/**
 * Validate ICS file size
 */
export function validateFileSize(fileContent: string) {
	const maxSizeBytes = 5 * 1024 * 1024; // 5MB
	const fileSizeBytes = new Blob([fileContent]).size;
	if (fileSizeBytes > maxSizeBytes) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `File too large. Maximum allowed size: 5MB. Current size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`,
		});
	}
}

/**
 * Convert parsed attendees to Prisma create format
 */
export function convertAttendeesForCreate(
	attendees?: Array<{
		name?: string;
		email: string;
		role?: string;
		status?: string;
		rsvp?: boolean;
	}>,
) {
	if (!attendees) return undefined;

	return {
		create: attendees.map((a) => ({
			name: a.name || null,
			email: a.email,
			role: parseAttendeeRole(a.role),
			status: parseAttendeeStatus(a.status),
			rsvp: a.rsvp ?? false,
		})),
	};
}

/**
 * Convert parsed alarms to Prisma create format
 */
export function convertAlarmsForCreate(
	alarms?: Array<{
		trigger: string;
		action: string;
		summary?: string;
		description?: string;
		duration?: string;
		repeat?: number;
	}>,
) {
	if (!alarms) return undefined;

	return {
		create: alarms.map((a) => {
			const action = parseAlarmAction(a.action);
			if (!action) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Invalid alarm action: ${a.action}`,
				});
			}
			return {
				trigger: a.trigger,
				action: action,
				summary: a.summary || null,
				description: a.description || null,
				duration: a.duration || null,
				repeat: a.repeat ?? null,
			};
		}),
	};
}

/**
 * Helper to convert string or undefined to string or null
 */
function toStringOrNull(value: string | undefined): string | null {
	return value || null;
}

/**
 * Helper to convert number or undefined to number or null
 */
function toNumberOrNull(value: number | undefined): number | null {
	return value ?? null;
}

/**
 * Extract basic metadata fields from parsed event
 */
function extractBasicMetadata(parsedEvent: ParsedEvent) {
	return {
		description: toStringOrNull(parsedEvent.description),
		location: toStringOrNull(parsedEvent.location),
		url: toStringOrNull(parsedEvent.url),
		comment: toStringOrNull(parsedEvent.comment),
		contact: toStringOrNull(parsedEvent.contact),
		rrule: toStringOrNull(parsedEvent.rrule),
		color: toStringOrNull(parsedEvent.color),
	};
}

/**
 * Extract organizer fields from parsed event
 */
function extractOrganizerFields(parsedEvent: ParsedEvent) {
	return {
		organizerName: toStringOrNull(parsedEvent.organizerName),
		organizerEmail: toStringOrNull(parsedEvent.organizerEmail),
	};
}

/**
 * Prepare event data from parsed ICS event
 */
function prepareEventDataFromParsed(
	calendarId: string,
	parsedEvent: ParsedEvent,
) {
	return {
		calendarId,
		title: parsedEvent.title,
		startDate: parsedEvent.startDate,
		endDate: parsedEvent.endDate,
		...extractBasicMetadata(parsedEvent),
		status: parseEventStatus(parsedEvent.status),
		priority: toNumberOrNull(parsedEvent.priority),
		class: parseEventClass(parsedEvent.class),
		sequence: parsedEvent.sequence ?? 0,
		transp: parseEventTransparency(parsedEvent.transp),
		geoLatitude: toNumberOrNull(parsedEvent.geoLatitude),
		geoLongitude: toNumberOrNull(parsedEvent.geoLongitude),
		...extractOrganizerFields(parsedEvent),
		uid: toStringOrNull(parsedEvent.uid),
		dtstamp: parsedEvent.dtstamp || new Date(),
		created: parsedEvent.created || null,
		lastModified: parsedEvent.lastModified || null,
		recurrenceId: toStringOrNull(parsedEvent.recurrenceId),
		relatedTo: toStringOrNull(parsedEvent.relatedTo),
		categories: prepareCategoriesData(parsedEvent.categories),
		resources: prepareResourcesData(parsedEvent.resources),
		recurrenceDates: prepareRecurrenceDatesData(
			parsedEvent.rdate,
			parsedEvent.exdate,
		),
		attendees: convertAttendeesForCreate(parsedEvent.attendees),
		alarms: convertAlarmsForCreate(parsedEvent.alarms),
	};
}

/**
 * Create event from parsed ICS data
 */
export async function createEventFromParsed(
	calendarId: string,
	parsedEvent: ParsedEvent,
) {
	const eventData = prepareEventDataFromParsed(calendarId, parsedEvent);
	return await prisma.event.create({ data: eventData });
}
