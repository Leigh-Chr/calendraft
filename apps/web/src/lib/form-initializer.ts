/**
 * Utility functions for initializing event form data
 */

import type { EventFormData } from "@/lib/event-form-types";

/**
 * Get default value for string fields
 */
function getStringDefault(
	value: string | undefined,
	defaultValue: string,
): string {
	return value || defaultValue;
}

/**
 * Get default value for optional fields
 */
function getOptionalDefault<T>(
	value: T | undefined,
	defaultValue: T | undefined,
): T | undefined {
	return value ?? defaultValue;
}

/**
 * Get default value for number fields
 */
function getNumberDefault(
	value: number | undefined,
	defaultValue: number,
): number {
	return value ?? defaultValue;
}

/**
 * Initialize form data from initial data with default values
 * @param initialData - Partial initial data
 * @returns Complete EventFormData object with defaults
 */
export function initializeFormData(
	initialData?: Partial<EventFormData>,
): EventFormData {
	const data = initialData || {};

	return {
		title: getStringDefault(data.title, ""),
		startDate: getStringDefault(data.startDate, ""),
		endDate: getStringDefault(data.endDate, ""),
		description: getStringDefault(data.description, ""),
		location: getStringDefault(data.location, ""),
		status: getOptionalDefault(data.status, undefined),
		priority: getOptionalDefault(data.priority, undefined),
		categories: getStringDefault(data.categories, ""),
		url: getStringDefault(data.url, ""),
		class: getOptionalDefault(data.class, undefined),
		resources: getStringDefault(data.resources, ""),
		transp: getOptionalDefault(data.transp, undefined),
		// Expert mode fields
		comment: getStringDefault(data.comment, ""),
		contact: getStringDefault(data.contact, ""),
		sequence: getNumberDefault(data.sequence, 0),
		rrule: getStringDefault(data.rrule, ""),
		rdate: getStringDefault(data.rdate, ""),
		exdate: getStringDefault(data.exdate, ""),
		geoLatitude: getOptionalDefault(data.geoLatitude, undefined),
		geoLongitude: getOptionalDefault(data.geoLongitude, undefined),
		organizerName: getStringDefault(data.organizerName, ""),
		organizerEmail: getStringDefault(data.organizerEmail, ""),
		uid: getStringDefault(data.uid, ""),
		recurrenceId: getStringDefault(data.recurrenceId, ""),
		relatedTo: getStringDefault(data.relatedTo, ""),
		color: getStringDefault(data.color, ""),
		attendees: data.attendees || [],
		alarms: data.alarms || [],
	};
}
