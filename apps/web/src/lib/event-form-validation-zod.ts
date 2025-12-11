/**
 * Validation functions for event form data using Zod schemas
 * Replaces manual validation with shared Zod schemas
 */

import {
	dateRangeSchema,
	dateStringSchema,
	eventFormDataSchema,
	geoCoordinatesSchema,
	uidSchema,
	type ValidationErrors,
} from "@calendraft/schemas";
import type { EventFormData } from "@/lib/event-form-types";

/**
 * Handle attendee validation errors
 */
function handleAttendeeError(
	errors: ValidationErrors,
	path: string,
	message: string,
) {
	const match = path.match(/attendees\.(\d+)\.(.+)/);
	if (!match) return;

	const index = Number.parseInt(match[1] || "0", 10);
	const field = match[2];
	if (!errors.attendeeEmails) {
		errors.attendeeEmails = {};
	}
	if (field === "email") {
		errors.attendeeEmails[index] = message;
	}
}

/**
 * Handle alarm validation errors
 */
function handleAlarmError(
	errors: ValidationErrors,
	path: string,
	message: string,
) {
	const match = path.match(/alarms\.(\d+)\.(.+)/);
	if (!match) return;

	const index = Number.parseInt(match[1] || "0", 10);
	const field = match[2];
	if (!errors.alarms) {
		errors.alarms = {};
	}
	if (!errors.alarms[index]) {
		errors.alarms[index] = {};
	}
	if (field === "summary" || field === "description" || field === "trigger") {
		errors.alarms[index][field] = message;
	}
}

/**
 * Handle top-level validation errors
 */
function handleTopLevelError(
	errors: ValidationErrors,
	path: string,
	message: string,
) {
	const errorMap: Record<string, keyof ValidationErrors> = {
		title: "title",
		startDate: "startDate",
		endDate: "endDate",
		url: "url",
		organizerEmail: "organizerEmail",
		uid: "uid",
		recurrenceId: "recurrenceId",
		geoLatitude: "geoLatitude",
		geoLongitude: "geoLongitude",
	};

	const errorKey = errorMap[path];
	if (errorKey) {
		errors[errorKey] = message;
	}
}

/**
 * Validate event form data using Zod schema
 * @param formData - Form data to validate
 * @returns Object containing validation errors, empty if valid
 */
export function validateEventForm(formData: EventFormData): ValidationErrors {
	const result = eventFormDataSchema.safeParse(formData);

	if (result.success) {
		return {};
	}

	const errors: ValidationErrors = {};

	// Check if dates are invalid before processing Zod errors
	// This handles cases where Zod doesn't return format errors but dates are still invalid
	const startDateValid =
		formData.startDate && !Number.isNaN(new Date(formData.startDate).getTime());
	const endDateValid =
		formData.endDate && !Number.isNaN(new Date(formData.endDate).getTime());

	if (!startDateValid || !endDateValid) {
		errors.dates = "Start and end dates must be valid";
		return errors; // Return early if dates are invalid
	}

	// Separate issues into date format errors and other errors
	const dateFormatIssues: typeof result.error.issues = [];
	const otherIssues: typeof result.error.issues = [];

	for (const issue of result.error.issues) {
		const path = issue.path.join(".");
		if (
			(path === "startDate" || path === "endDate") &&
			(issue.message.includes("Invalid date format") ||
				issue.message.includes("Date is required") ||
				(issue.code === "custom" &&
					issue.message.includes("Invalid date format")) ||
				issue.code === "invalid_type")
		) {
			dateFormatIssues.push(issue);
		} else {
			otherIssues.push(issue);
		}
	}

	// First pass: handle date format errors (highest priority)
	if (dateFormatIssues.length > 0) {
		errors.dates = "Start and end dates must be valid";
	}

	// Second pass: handle all other errors
	for (const issue of otherIssues) {
		const path = issue.path.join(".");

		if (path.startsWith("attendees.")) {
			handleAttendeeError(errors, path, issue.message);
		} else if (path.startsWith("alarms.")) {
			handleAlarmError(errors, path, issue.message);
		} else if (
			path === "endDate" &&
			issue.message.includes("after") &&
			!errors.dates
		) {
			// Map endDate errors about "after" to errors.dates, but only if dates not already set
			errors.dates = "End date must be after start date";
		} else {
			handleTopLevelError(errors, path, issue.message);
		}
	}

	return errors;
}

/**
 * Validate start date using Zod schema
 * Uses dateStringSchema from common-schemas for consistency
 */
export function validateStartDate(
	startDate: string,
	endDate?: string,
): string | undefined {
	// Use Zod schema for validation
	const result = dateStringSchema.safeParse(startDate);
	if (!result.success) {
		return result.error.issues[0]?.message || "Start date is not valid";
	}

	// Check date range if endDate is provided
	if (endDate) {
		const rangeResult = dateRangeSchema.safeParse({ startDate, endDate });
		if (!rangeResult.success) {
			const endDateError = rangeResult.error.issues.find(
				(issue) => issue.path[0] === "endDate",
			);
			if (endDateError) {
				return "Start date must be before end date";
			}
		}
	}
	return undefined;
}

/**
 * Validate end date using Zod schema
 * Uses dateStringSchema from common-schemas for consistency
 */
export function validateEndDate(
	endDate: string,
	startDate?: string,
): string | undefined {
	// Use Zod schema for validation
	const result = dateStringSchema.safeParse(endDate);
	if (!result.success) {
		return result.error.issues[0]?.message || "End date is not valid";
	}

	// Check date range if startDate is provided
	if (startDate) {
		const rangeResult = dateRangeSchema.safeParse({ startDate, endDate });
		if (!rangeResult.success) {
			const endDateError = rangeResult.error.issues.find(
				(issue) => issue.path[0] === "endDate",
			);
			if (endDateError) {
				return endDateError.message || "End date must be after start date";
			}
		}
	}
	return undefined;
}

/**
 * Validate geographic coordinates using Zod schema
 * Uses geoCoordinatesSchema from event-schemas for consistency
 */
export function validateGeoCoordinates(
	geoLatitude?: number,
	geoLongitude?: number,
): { geoLatitude?: string; geoLongitude?: string } | undefined {
	// Use Zod schema for validation
	const result = geoCoordinatesSchema.safeParse({ geoLatitude, geoLongitude });
	if (!result.success) {
		const errors: { geoLatitude?: string; geoLongitude?: string } = {};
		for (const issue of result.error.issues) {
			if (issue.path[0] === "geoLatitude") {
				errors.geoLatitude = issue.message;
			} else if (issue.path[0] === "geoLongitude") {
				errors.geoLongitude = issue.message;
			}
		}
		return Object.keys(errors).length > 0 ? errors : undefined;
	}
	return undefined;
}

/**
 * Validate UID format using Zod schema
 * Uses uidSchema from event-schemas for consistency
 */
export function validateUID(uid: string | undefined): string | undefined {
	if (!uid || !uid.trim()) return undefined;
	const result = uidSchema.safeParse(uid);
	if (!result.success) {
		return result.error.issues[0]?.message || "Invalid UID format";
	}
	return undefined;
}

/**
 * Check if form data has any validation errors
 * @param errors - Validation errors object
 * @returns True if there are errors, false otherwise
 */
export function hasValidationErrors(errors: ValidationErrors): boolean {
	// Check all top-level errors
	if (
		errors.title ||
		errors.startDate ||
		errors.endDate ||
		errors.dates ||
		errors.url ||
		errors.organizerEmail ||
		errors.uid ||
		errors.recurrenceId ||
		errors.relatedTo ||
		errors.geoLatitude ||
		errors.geoLongitude
	) {
		return true;
	}

	// Check nested errors (attendeeEmails, alarms)
	if (errors.attendeeEmails && Object.keys(errors.attendeeEmails).length > 0) {
		return true;
	}

	if (errors.alarms && Object.keys(errors.alarms).length > 0) {
		return true;
	}

	return false;
}
