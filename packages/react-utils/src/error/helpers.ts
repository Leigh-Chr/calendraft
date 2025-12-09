/**
 * Error handling helper functions
 */

import type { AppError, ErrorContext, ErrorSeverity } from "./types";

/**
 * Create a standardized app error
 */
export function createAppError(
	code: string,
	message: string,
	details?: Record<string, unknown>,
): AppError {
	return {
		code,
		message,
		details: details ?? undefined,
		timestamp: new Date(),
	};
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			message.includes("network") ||
			message.includes("fetch") ||
			message.includes("connection") ||
			message.includes("offline")
		);
	}
	return false;
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.toLowerCase().includes("timeout") ||
			error.name === "AbortError"
		);
	}
	return false;
}

/**
 * Get error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object" && "message" in error) {
		return String(error.message);
	}
	return "Une erreur inconnue est survenue";
}

/**
 * Get error code from unknown error
 */
export function getErrorCode(error: unknown): string | undefined {
	if (error && typeof error === "object") {
		const errorRecord = error as Record<string, unknown>;
		if ("code" in errorRecord) {
			return String(errorRecord["code"]);
		}
		if (
			"data" in errorRecord &&
			errorRecord["data"] &&
			typeof errorRecord["data"] === "object"
		) {
			const data = errorRecord["data"] as Record<string, unknown>;
			if ("code" in data) {
				return String(data["code"]);
			}
		}
	}
	return undefined;
}

/**
 * Determine error severity
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
	const code = getErrorCode(error);

	if (code) {
		if (code.startsWith("AUTH_")) return "warning";
		if (code.startsWith("VALIDATION_")) return "info";
		if (code === "INTERNAL_SERVER_ERROR") return "critical";
	}

	if (isNetworkError(error)) return "error";
	if (isTimeoutError(error)) return "warning";

	return "error";
}

/**
 * Format error for logging
 */
export function formatErrorForLog(
	error: unknown,
	context?: ErrorContext,
): string {
	const message = getErrorMessage(error);
	const code = getErrorCode(error);
	const severity = getErrorSeverity(error);

	let log = `[${severity.toUpperCase()}]`;
	if (code) log += ` (${code})`;
	log += ` ${message}`;
	if (context?.source) log += ` | Source: ${context.source}`;
	if (context?.action) log += ` | Action: ${context.action}`;

	return log;
}

/**
 * Safely log error in development only
 */
export function logErrorInDev(error: unknown, context?: ErrorContext): void {
	// Check for Vite's import.meta.env.DEV or process.env.NODE_ENV
	let isDev = false;

	try {
		// Check Vite's import.meta.env
		if (typeof import.meta !== "undefined" && import.meta.env) {
			isDev = Boolean(import.meta.env["DEV"]);
		}
	} catch {
		// Ignore if import.meta is not available
	}

	// Fallback to process.env
	if (
		!isDev &&
		typeof process !== "undefined" &&
		process.env?.NODE_ENV === "development"
	) {
		isDev = true;
	}

	if (isDev) {
		console.error(formatErrorForLog(error, context), error);
	}
}
