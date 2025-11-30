/**
 * Utility functions to parse TRPC validation errors and convert them to ValidationErrors
 */

import type { ValidationErrors } from "@calendraft/schemas";
import type { TRPCClientErrorLike } from "@trpc/client";

interface ZodErrorIssue {
	code: string;
	path: (string | number)[];
	message: string;
}

/**
 * Check if error is a TRPC client error
 */
export function isTRPCClientError(
	error: unknown,
): error is TRPCClientErrorLike<unknown> {
	return (
		error !== null &&
		typeof error === "object" &&
		"data" in error &&
		"message" in error
	);
}

/**
 * Parse TRPC error message that contains JSON stringified Zod errors
 */
function parseTrpcErrorMessage(message: string): ZodErrorIssue[] {
	try {
		// Try to parse as JSON first
		const parsed = JSON.parse(message);
		if (Array.isArray(parsed)) {
			return parsed as ZodErrorIssue[];
		}
	} catch {
		// If parsing fails, return empty array
	}
	return [];
}

/**
 * Handle attendee validation errors from TRPC
 */
function handleAttendeeError(
	errors: ValidationErrors,
	path: (string | number)[],
	message: string,
) {
	const index = path[1];
	if (typeof index === "number") {
		const field = path[2];
		if (field === "email") {
			if (!errors.attendeeEmails) {
				errors.attendeeEmails = {};
			}
			errors.attendeeEmails[index] = message;
		}
	}
}

/**
 * Handle alarm validation errors from TRPC
 */
function handleAlarmError(
	errors: ValidationErrors,
	path: (string | number)[],
	message: string,
) {
	const index = path[1];
	if (typeof index === "number") {
		const field = path[2];
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
}

/**
 * Handle top-level validation errors from TRPC
 */
function handleTopLevelError(
	errors: ValidationErrors,
	path: (string | number)[],
	message: string,
) {
	const field = path[0];
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

	if (typeof field === "string") {
		const errorKey = errorMap[field];
		if (errorKey) {
			errors[errorKey] = message;
		}
	}
}

/**
 * Convert TRPC validation errors to ValidationErrors format
 * @param error - TRPC error object
 * @returns ValidationErrors object or null if error cannot be parsed
 */
export function parseTrpcValidationErrors(
	error: TRPCClientErrorLike<unknown>,
): ValidationErrors | null {
	const message = error.message;
	if (!message) return null;

	// Parse the JSON stringified error message
	const issues = parseTrpcErrorMessage(message);
	if (issues.length === 0) {
		// Check if it's a BAD_REQUEST error (validation errors are usually BAD_REQUEST)
		// but message is not JSON - might be a different format
		return null;
	}

	const errors: ValidationErrors = {};

	for (const issue of issues) {
		const path = issue.path;

		if (path.length === 0) continue;

		// Handle nested errors (attendees, alarms)
		if (path[0] === "attendees") {
			handleAttendeeError(errors, path, issue.message);
		} else if (path[0] === "alarms") {
			handleAlarmError(errors, path, issue.message);
		} else {
			// Handle top-level errors
			handleTopLevelError(errors, path, issue.message);
		}
	}

	return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Extract error from nested alarm errors
 */
function getFirstAlarmError(
	alarms: ValidationErrors["alarms"],
): string | undefined {
	if (!alarms) return undefined;
	const firstAlarmError = Object.values(alarms)[0];
	return (
		firstAlarmError?.summary ||
		firstAlarmError?.description ||
		firstAlarmError?.trigger
	);
}

/**
 * Extract the first validation error message for display in toast
 * @param errors - ValidationErrors object
 * @returns First error message or fallback message
 */
export function getFirstValidationError(
	errors: ValidationErrors,
	fallback = "Veuillez corriger les erreurs dans le formulaire",
): string {
	// Priority order for error display (top-level first)
	const priorityFields: Array<keyof ValidationErrors> = [
		"title",
		"endDate",
		"startDate",
		"dates",
		"url",
		"organizerEmail",
		"geoLatitude",
		"geoLongitude",
		"uid",
		"recurrenceId",
		"relatedTo",
	];

	for (const field of priorityFields) {
		const error = errors[field];
		if (typeof error === "string" && error) return error;
	}

	// Check nested errors
	const alarmError = getFirstAlarmError(errors.alarms);
	if (alarmError) return alarmError;

	if (errors.attendeeEmails) {
		const firstAttendeeError = Object.values(errors.attendeeEmails)[0];
		if (firstAttendeeError) return firstAttendeeError;
	}

	return fallback;
}

/**
 * Handle TRPC mutation error with validation error parsing
 * @param error - Unknown error from mutation
 * @param options - Options for error handling
 * @returns ValidationErrors if validation error, null otherwise
 */
export function handleTRPCMutationError(
	error: unknown,
	options?: {
		onValidationError?: (errors: ValidationErrors) => void;
		onGenericError?: (message: string) => void;
	},
): ValidationErrors | null {
	const { onValidationError, onGenericError } = options || {};

	if (!isTRPCClientError(error)) {
		const message =
			error instanceof Error ? error.message : "Une erreur est survenue";
		onGenericError?.(message);
		return null;
	}

	const validationErrors = parseTrpcValidationErrors(error);

	if (validationErrors) {
		onValidationError?.(validationErrors);
		return validationErrors;
	}

	// Fallback to generic error
	const message = error.message || "Une erreur est survenue";
	onGenericError?.(message);
	return null;
}
