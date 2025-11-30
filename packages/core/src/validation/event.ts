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
			message: `${fieldName} doit contenir au maximum ${maxLength} caractères`,
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
			message: `${fieldName} est requis`,
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
			message: "L'email du participant est requis",
		});
	} else if (!isValidEmail(attendee.email)) {
		errors.push({
			field: `attendees[${index}].email`,
			message: "Format d'email invalide",
		});
	}

	if (attendee.name && attendee.name.length > FIELD_LIMITS.NAME) {
		errors.push({
			field: `attendees[${index}].name`,
			message: `Le nom doit contenir au maximum ${FIELD_LIMITS.NAME} caractères`,
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
			message: "Le déclencheur de l'alarme est requis",
		});
	}

	if (!alarm.action) {
		errors.push({
			field: `alarms[${index}].action`,
			message: "L'action de l'alarme est requise",
		});
	}

	if (alarm.summary && alarm.summary.length > FIELD_LIMITS.ALARM_SUMMARY) {
		errors.push({
			field: `alarms[${index}].summary`,
			message: `Le résumé doit contenir au maximum ${FIELD_LIMITS.ALARM_SUMMARY} caractères`,
		});
	}

	return errors;
}

/**
 * Validate event form data
 */
export function validateEventForm(data: EventFormData): ValidationResult {
	const errors: ValidationError[] = [];

	// Required fields
	const titleError = validateRequired(data.title, "title");
	if (titleError) errors.push(titleError);

	// Length validations
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

	// Date validation
	if (!data.startDate) {
		errors.push({
			field: "startDate",
			message: "La date de début est requise",
		});
	}

	if (!data.endDate) {
		errors.push({
			field: "endDate",
			message: "La date de fin est requise",
		});
	}

	if (data.startDate && data.endDate) {
		const start = new Date(data.startDate);
		const end = new Date(data.endDate);
		if (end < start) {
			errors.push({
				field: "endDate",
				message: "La date de fin doit être après la date de début",
			});
		}
	}

	// URL validation
	if (data.url && !isValidUrl(data.url)) {
		errors.push({
			field: "url",
			message: "URL invalide",
		});
	}

	// Email validations
	if (data.organizerEmail && !isValidEmail(data.organizerEmail)) {
		errors.push({
			field: "organizerEmail",
			message: "Format d'email invalide pour l'organisateur",
		});
	}

	// Color validation
	if (data.color && !isValidHexColor(data.color)) {
		errors.push({
			field: "color",
			message: "Format de couleur invalide (attendu: #RRGGBB)",
		});
	}

	// Priority validation
	if (data.priority !== undefined && (data.priority < 0 || data.priority > 9)) {
		errors.push({
			field: "priority",
			message: "La priorité doit être entre 0 et 9",
		});
	}

	// Validate attendees
	if (data.attendees) {
		data.attendees.forEach((attendee, index) => {
			errors.push(...validateAttendee(attendee, index));
		});
	}

	// Validate alarms
	if (data.alarms) {
		data.alarms.forEach((alarm, index) => {
			errors.push(...validateAlarm(alarm, index));
		});
	}

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
