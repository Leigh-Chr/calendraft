/**
 * Form utility functions for event data
 * Handles initialization and transformation of form data
 */

import {
	type AlarmActionValue,
	type AttendeeRoleValue,
	type AttendeeStatusValue,
	isValidAlarmAction,
	isValidAttendeeRole,
	isValidAttendeeStatus,
} from "../constants/ics-enums";
import type { AlarmData, AttendeeData, EventFormData } from "../types/event";

// ----- Initialization -----

/**
 * Initialize form data with default values
 * @param initialData - Partial initial data
 * @returns Complete EventFormData with defaults
 */
export function initializeFormData(
	initialData?: Partial<EventFormData>,
): EventFormData {
	const data = initialData || {};

	return {
		title: data.title || "",
		startDate: data.startDate || "",
		endDate: data.endDate || "",
		description: data.description || "",
		location: data.location || "",
		status: data.status,
		priority: data.priority,
		categories: data.categories || "",
		url: data.url || "",
		class: data.class,
		resources: data.resources || "",
		transp: data.transp,
		comment: data.comment || "",
		contact: data.contact || "",
		sequence: data.sequence ?? 0,
		rrule: data.rrule || "",
		rdate: data.rdate || "",
		exdate: data.exdate || "",
		geoLatitude: data.geoLatitude,
		geoLongitude: data.geoLongitude,
		organizerName: data.organizerName || "",
		organizerEmail: data.organizerEmail || "",
		uid: data.uid || "",
		recurrenceId: data.recurrenceId || "",
		relatedTo: data.relatedTo || "",
		color: data.color || "",
		attendees: data.attendees || [],
		alarms: data.alarms || [],
	};
}

// ----- Transformation -----

interface TransformedAttendee {
	name: string | null;
	email: string;
	role: AttendeeRoleValue | null;
	status: AttendeeStatusValue | null;
	rsvp: boolean;
}

interface TransformedAlarm {
	trigger: string;
	action: AlarmActionValue;
	summary: string | null;
	description: string | null;
	duration: string | null;
	repeat: number | null;
}

function transformAttendees(
	attendees: AttendeeData[] | undefined,
): TransformedAttendee[] | undefined {
	if (!attendees?.length) return undefined;
	return attendees.map((a) => ({
		name: a.name || null,
		email: a.email,
		role:
			a.role && isValidAttendeeRole(a.role)
				? (a.role as AttendeeRoleValue)
				: null,
		status:
			a.status && isValidAttendeeStatus(a.status)
				? (a.status as AttendeeStatusValue)
				: null,
		rsvp: a.rsvp ?? false,
	}));
}

function transformAlarms(
	alarms: AlarmData[] | undefined,
): TransformedAlarm[] | undefined {
	if (!alarms?.length) return undefined;
	return alarms.map((a) => ({
		trigger: a.trigger,
		action:
			a.action && isValidAlarmAction(a.action)
				? (a.action as AlarmActionValue)
				: "DISPLAY",
		summary: a.summary || null,
		description: a.description || null,
		duration: a.duration || null,
		repeat: a.repeat ?? null,
	}));
}

/**
 * Transform EventFormData to API format
 * @param data - Form data to transform
 * @param calendarId - Calendar ID (optional, for create operations)
 * @returns Transformed data ready for API
 */
export function transformEventFormData(
	data: EventFormData,
	calendarId?: string,
) {
	const result = {
		title: data.title,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		description: data.description || null,
		location: data.location || null,
		status: data.status || null,
		priority: data.priority ?? null,
		categories: data.categories || null,
		url: data.url || null,
		class: data.class || null,
		comment: data.comment || null,
		contact: data.contact || null,
		resources: data.resources || null,
		sequence: data.sequence ?? null,
		transp: data.transp || null,
		rrule: data.rrule || null,
		rdate: data.rdate || null,
		exdate: data.exdate || null,
		geoLatitude: data.geoLatitude ?? null,
		geoLongitude: data.geoLongitude ?? null,
		organizerName: data.organizerName || null,
		organizerEmail: data.organizerEmail || null,
		uid: data.uid || null,
		recurrenceId: data.recurrenceId || null,
		relatedTo: data.relatedTo || null,
		color: data.color || null,
		attendees: transformAttendees(data.attendees),
		alarms: transformAlarms(data.alarms),
	};

	if (calendarId) {
		return { calendarId, ...result };
	}

	return result;
}
