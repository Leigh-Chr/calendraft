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
 * Default values for string fields
 */
const STRING_FIELD_DEFAULTS: Record<string, string> = {
	title: "",
	startDate: "",
	endDate: "",
	description: "",
	location: "",
	categories: "",
	url: "",
	resources: "",
	comment: "",
	contact: "",
	rrule: "",
	rdate: "",
	exdate: "",
	organizerName: "",
	organizerEmail: "",
	uid: "",
	recurrenceId: "",
	relatedTo: "",
	color: "",
};

/**
 * Get string value with fallback to default
 */
function getStringValue(
	data: Partial<EventFormData>,
	key: keyof EventFormData,
): string {
	const value = data[key];
	if (typeof value === "string") return value;
	return STRING_FIELD_DEFAULTS[key] ?? "";
}

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
		title: getStringValue(data, "title"),
		startDate: getStringValue(data, "startDate"),
		endDate: getStringValue(data, "endDate"),
		description: getStringValue(data, "description"),
		location: getStringValue(data, "location"),
		status: data.status,
		priority: data.priority,
		categories: getStringValue(data, "categories"),
		url: getStringValue(data, "url"),
		class: data.class,
		resources: getStringValue(data, "resources"),
		transp: data.transp,
		comment: getStringValue(data, "comment"),
		contact: getStringValue(data, "contact"),
		sequence: data.sequence ?? 0,
		rrule: getStringValue(data, "rrule"),
		rdate: getStringValue(data, "rdate"),
		exdate: getStringValue(data, "exdate"),
		geoLatitude: data.geoLatitude,
		geoLongitude: data.geoLongitude,
		organizerName: getStringValue(data, "organizerName"),
		organizerEmail: getStringValue(data, "organizerEmail"),
		uid: getStringValue(data, "uid"),
		recurrenceId: getStringValue(data, "recurrenceId"),
		relatedTo: getStringValue(data, "relatedTo"),
		color: getStringValue(data, "color"),
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
 * Convert string to null if empty
 */
function toNullIfEmpty(value: string | undefined): string | null {
	return value || null;
}

/**
 * Convert number to null if undefined
 */
function toNullIfUndefined(value: number | undefined): number | null {
	return value ?? null;
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
		description: toNullIfEmpty(data.description),
		location: toNullIfEmpty(data.location),
		status: toNullIfEmpty(data.status),
		priority: toNullIfUndefined(data.priority),
		categories: toNullIfEmpty(data.categories),
		url: toNullIfEmpty(data.url),
		class: toNullIfEmpty(data.class),
		comment: toNullIfEmpty(data.comment),
		contact: toNullIfEmpty(data.contact),
		resources: toNullIfEmpty(data.resources),
		sequence: toNullIfUndefined(data.sequence),
		transp: toNullIfEmpty(data.transp),
		rrule: toNullIfEmpty(data.rrule),
		rdate: toNullIfEmpty(data.rdate),
		exdate: toNullIfEmpty(data.exdate),
		geoLatitude: toNullIfUndefined(data.geoLatitude),
		geoLongitude: toNullIfUndefined(data.geoLongitude),
		organizerName: toNullIfEmpty(data.organizerName),
		organizerEmail: toNullIfEmpty(data.organizerEmail),
		uid: toNullIfEmpty(data.uid),
		recurrenceId: toNullIfEmpty(data.recurrenceId),
		relatedTo: toNullIfEmpty(data.relatedTo),
		color: toNullIfEmpty(data.color),
		attendees: transformAttendees(data.attendees),
		alarms: transformAlarms(data.alarms),
	};

	return calendarId ? { calendarId, ...result } : result;
}
