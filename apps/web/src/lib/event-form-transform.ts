/**
 * Transformation utilities for converting EventFormData to API format
 */

import {
	type AlarmAction,
	type AttendeeRole,
	type AttendeeStatus,
	type EventClass,
	type EventStatus,
	type EventTransp,
	isValidAlarmAction,
	isValidAttendeeRole,
	isValidAttendeeStatus,
	isValidEventClass,
	isValidEventStatus,
	isValidEventTransp,
} from "@/lib/event-form-constants";
import type { EventFormData } from "@/lib/event-form-types";

/**
 * Transform attendees array
 */
function transformAttendees(attendees: EventFormData["attendees"]):
	| Array<{
			name: string | null;
			email: string;
			role: AttendeeRole | null;
			status: AttendeeStatus | null;
			rsvp: boolean;
	  }>
	| undefined {
	if (!attendees) return undefined;
	return attendees.map((a) => ({
		name: a.name || null,
		email: a.email,
		role:
			a.role && isValidAttendeeRole(a.role) ? (a.role as AttendeeRole) : null,
		status:
			a.status && isValidAttendeeStatus(a.status)
				? (a.status as AttendeeStatus)
				: null,
		rsvp: a.rsvp ?? false,
	}));
}

/**
 * Transform alarms array
 */
function transformAlarms(alarms: EventFormData["alarms"]):
	| Array<{
			trigger: string;
			action: AlarmAction;
			summary: string | null;
			description: string | null;
			duration: string | null;
			repeat: number | null;
	  }>
	| undefined {
	if (!alarms) return undefined;
	return alarms.map((a) => ({
		trigger: a.trigger,
		action:
			a.action && isValidAlarmAction(a.action)
				? (a.action as AlarmAction)
				: "DISPLAY",
		summary: a.summary || null,
		description: a.description || null,
		duration: a.duration || null,
		repeat: a.repeat ?? null,
	}));
}

/**
 * Transform enum field with validation
 */
function transformEnumField<T extends string>(
	value: string | undefined,
	validator: (val: string) => boolean,
): T | undefined {
	return value && validator(value) ? (value as T) : undefined;
}

/**
 * Transform string field (empty string to undefined)
 */
function transformStringField(value: string | undefined): string | undefined {
	return value || undefined;
}

/**
 * Transform number field
 */
function transformNumberField(value: number | undefined): number | undefined {
	return value ?? undefined;
}

/**
 * Transform basic event fields
 */
function transformBasicFields(data: EventFormData) {
	return {
		title: data.title,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		description: transformStringField(data.description),
		location: transformStringField(data.location),
		status: transformEnumField<EventStatus>(data.status, isValidEventStatus),
		priority: transformNumberField(data.priority),
		categories: transformStringField(data.categories),
		url: transformStringField(data.url),
		class: transformEnumField<EventClass>(data.class, isValidEventClass),
		comment: transformStringField(data.comment),
		contact: transformStringField(data.contact),
		resources: transformStringField(data.resources),
		sequence: transformNumberField(data.sequence),
		transp: transformEnumField<EventTransp>(data.transp, isValidEventTransp),
		rrule: transformStringField(data.rrule),
		rdate: transformStringField(data.rdate),
		exdate: transformStringField(data.exdate),
		geoLatitude: transformNumberField(data.geoLatitude),
		geoLongitude: transformNumberField(data.geoLongitude),
		organizerName: transformStringField(data.organizerName),
		organizerEmail: transformStringField(data.organizerEmail),
		uid: transformStringField(data.uid),
		recurrenceId: transformStringField(data.recurrenceId),
		relatedTo: transformStringField(data.relatedTo),
		color: transformStringField(data.color),
	};
}

/**
 * Transform EventFormData to API create/update format
 * @param data - Form data to transform
 * @param calendarId - Calendar ID (only for create)
 * @returns Transformed data ready for API
 */
export function transformEventFormDataToAPI(
	data: EventFormData,
	calendarId?: string,
) {
	const base = {
		...transformBasicFields(data),
		attendees: transformAttendees(data.attendees),
		alarms: transformAlarms(data.alarms),
	};

	// Add calendarId for create operations
	if (calendarId) {
		return { calendarId, ...base };
	}

	return base;
}

/**
 * Transform enum field with validation (for update, returns null instead of undefined)
 */
function transformEnumFieldForUpdate<T extends string>(
	value: string | undefined,
	validator: (val: string) => boolean,
): T | null {
	return value && validator(value) ? (value as T) : null;
}

/**
 * Transform string field (for update, empty string to null)
 */
function transformStringFieldForUpdate(
	value: string | undefined,
): string | null {
	return value || null;
}

/**
 * Transform number field (for update, returns null instead of undefined)
 */
function transformNumberFieldForUpdate(
	value: number | undefined,
): number | null {
	return value ?? null;
}

/**
 * Transform for update operations (uses null instead of undefined)
 */
export function transformEventFormDataForUpdate(data: EventFormData) {
	return {
		title: data.title,
		startDate: new Date(data.startDate),
		endDate: new Date(data.endDate),
		description: transformStringFieldForUpdate(data.description),
		location: transformStringFieldForUpdate(data.location),
		status: transformEnumFieldForUpdate<EventStatus>(
			data.status,
			isValidEventStatus,
		),
		priority: transformNumberFieldForUpdate(data.priority),
		categories: transformStringFieldForUpdate(data.categories),
		url: transformStringFieldForUpdate(data.url),
		class: transformEnumFieldForUpdate<EventClass>(
			data.class,
			isValidEventClass,
		),
		comment: transformStringFieldForUpdate(data.comment),
		contact: transformStringFieldForUpdate(data.contact),
		resources: transformStringFieldForUpdate(data.resources),
		sequence: transformNumberFieldForUpdate(data.sequence),
		transp: transformEnumFieldForUpdate<EventTransp>(
			data.transp,
			isValidEventTransp,
		),
		rrule: transformStringFieldForUpdate(data.rrule),
		rdate: transformStringFieldForUpdate(data.rdate),
		exdate: transformStringFieldForUpdate(data.exdate),
		geoLatitude: transformNumberFieldForUpdate(data.geoLatitude),
		geoLongitude: transformNumberFieldForUpdate(data.geoLongitude),
		organizerName: transformStringFieldForUpdate(data.organizerName),
		organizerEmail: transformStringFieldForUpdate(data.organizerEmail),
		uid: transformStringFieldForUpdate(data.uid),
		recurrenceId: transformStringFieldForUpdate(data.recurrenceId),
		relatedTo: transformStringFieldForUpdate(data.relatedTo),
		color: transformStringFieldForUpdate(data.color),
		attendees: transformAttendees(data.attendees),
		alarms: transformAlarms(data.alarms),
	};
}
