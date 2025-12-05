/**
 * Pure validation functions for events
 * No framework dependencies
 */

import { FIELD_LIMITS } from "../constants/field-limits";
import type { AlarmData, AttendeeData, EventFormData } from "../types/event";

export interface ValidationError {
	field: string;
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
	return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}

/**
 * Validate string length
 */
export function validateLength(
	value: string | undefined,
	maxLength: number,
	fieldName: string,
): ValidationError | null {
	if (value && value.length > maxLength) {
		return {
			field: fieldName,
			message: `${fieldName} must contain at most ${maxLength} characters`,
		};
	}
	return null;
}

/**
 * Validate required string field
 */
export function validateRequired(
	value: string | undefined,
	fieldName: string,
): ValidationError | null {
	if (!value || value.trim().length === 0) {
		return {
			field: fieldName,
			message: `${fieldName} is required`,
		};
	}
	return null;
}

/**
 * Validate an attendee
 */
export function validateAttendee(
	attendee: AttendeeData,
	index: number,
): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!attendee.email) {
		errors.push({
			field: `attendees[${index}].email`,
			message: "Attendee email is required",
		});
	} else if (!isValidEmail(attendee.email)) {
		errors.push({
			field: `attendees[${index}].email`,
			message: "Invalid email format",
		});
	}

	if (attendee.name && attendee.name.length > FIELD_LIMITS.NAME) {
		errors.push({
			field: `attendees[${index}].name`,
			message: `Name must contain at most ${FIELD_LIMITS.NAME} characters`,
		});
	}

	return errors;
}

/**
 * Validate an alarm
 */
export function validateAlarm(
	alarm: AlarmData,
	index: number,
): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!alarm.trigger) {
		errors.push({
			field: `alarms[${index}].trigger`,
			message: "Alarm trigger is required",
		});
	}

	if (!alarm.action) {
		errors.push({
			field: `alarms[${index}].action`,
			message: "Alarm action is required",
		});
	}

	if (alarm.summary && alarm.summary.length > FIELD_LIMITS.ALARM_SUMMARY) {
		errors.push({
			field: `alarms[${index}].summary`,
			message: `Summary must contain at most ${FIELD_LIMITS.ALARM_SUMMARY} characters`,
		});
	}

	return errors;
}

/**
 * Validate required fields and their lengths
 */
function validateRequiredFields(data: EventFormData): ValidationError[] {
	const errors: ValidationError[] = [];

	const titleError = validateRequired(data.title, "title");
	if (titleError) errors.push(titleError);

	const titleLengthError = validateLength(
		data.title,
		FIELD_LIMITS.TITLE,
		"title",
	);
	if (titleLengthError) errors.push(titleLengthError);

	const locationError = validateLength(
		data.location,
		FIELD_LIMITS.LOCATION,
		"location",
	);
	if (locationError) errors.push(locationError);

	const descriptionError = validateLength(
		data.description,
		FIELD_LIMITS.DESCRIPTION,
		"description",
	);
	if (descriptionError) errors.push(descriptionError);

	return errors;
}

/**
 * Validate date fields
 */
function validateDateFields(data: EventFormData): ValidationError[] {
	const errors: ValidationError[] = [];

	if (!data.startDate) {
		errors.push({
			field: "startDate",
			message: "Start date is required",
		});
	}

	if (!data.endDate) {
		errors.push({
			field: "endDate",
			message: "End date is required",
		});
	}

	if (data.startDate && data.endDate) {
		const start = new Date(data.startDate);
		const end = new Date(data.endDate);
		if (end < start) {
			errors.push({
				field: "endDate",
				message: "End date must be after start date",
			});
		}
	}

	return errors;
}

/**
 * Validate optional format fields (URL, email, color, priority)
 */
function validateFormatFields(data: EventFormData): ValidationError[] {
	const errors: ValidationError[] = [];

	if (data.url && !isValidUrl(data.url)) {
		errors.push({ field: "url", message: "Invalid URL" });
	}

	if (data.organizerEmail && !isValidEmail(data.organizerEmail)) {
		errors.push({
			field: "organizerEmail",
			message: "Invalid email format for organizer",
		});
	}

	if (data.color && !isValidHexColor(data.color)) {
		errors.push({
			field: "color",
			message: "Invalid color format (expected: #RRGGBB)",
		});
	}

	if (data.priority !== undefined && (data.priority < 0 || data.priority > 9)) {
		errors.push({
			field: "priority",
			message: "Priority must be between 0 and 9",
		});
	}

	return errors;
}

/**
 * Validate all attendees
 */
function validateAllAttendees(
	attendees: AttendeeData[] | undefined,
): ValidationError[] {
	if (!attendees) return [];
	return attendees.flatMap((attendee, index) =>
		validateAttendee(attendee, index),
	);
}

/**
 * Validate all alarms
 */
function validateAllAlarms(alarms: AlarmData[] | undefined): ValidationError[] {
	if (!alarms) return [];
	return alarms.flatMap((alarm, index) => validateAlarm(alarm, index));
}

/**
 * Validate event form data
 */
export function validateEventForm(data: EventFormData): ValidationResult {
	const errors: ValidationError[] = [
		...validateRequiredFields(data),
		...validateDateFields(data),
		...validateFormatFields(data),
		...validateAllAttendees(data.attendees),
		...validateAllAlarms(data.alarms),
	];

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Get first error for a specific field
 */
export function getFieldError(
	result: ValidationResult,
	fieldName: string,
): string | undefined {
	return result.errors.find((e) => e.field === fieldName)?.message;
}

/**
 * Check if form has any errors
 */
export function hasErrors(result: ValidationResult): boolean {
	return !result.valid;
}
