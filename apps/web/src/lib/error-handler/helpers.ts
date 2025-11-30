/**
 * Error handler helper functions
 */

import type { AppRouter } from "@calendraft/api/routers/index";
import type { TRPCClientError, TRPCClientErrorLike } from "@trpc/client";
import { toast } from "sonner";
import { ERROR_MESSAGES, NETWORK_ERROR_PATTERNS } from "./constants";
import type { ErrorResult } from "./types";

/**
 * Extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Une erreur inconnue est survenue";
}

/**
 * Check if error message matches network error patterns
 */
export function isNetworkError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	const isPattern = NETWORK_ERROR_PATTERNS.some((p) => message.includes(p));
	return isPattern || error.name === "NetworkError";
}

/**
 * Extract tRPC error code from error object
 */
export function getTRPCErrorCode(error: unknown): string {
	if (!error || typeof error !== "object" || !("data" in error)) {
		return "UNKNOWN";
	}
	const data = error.data as { code?: string };
	const code = data?.code;
	return code && code in ERROR_MESSAGES ? code : "UNKNOWN";
}

/**
 * Log error details in development mode
 */
export function logErrorDetails(
	error: TRPCClientErrorLike<AppRouter> | TRPCClientError<AppRouter>,
): void {
	if (!import.meta.env.DEV) return;
	console.error("tRPC Error:", {
		message: error.message,
		data: error.data,
		shape: error.shape,
		cause: "cause" in error ? error.cause : undefined,
	});
}

/**
 * Show toast notification for error
 */
export function showErrorToast(
	title: string,
	description: string,
	duration = 6000,
): void {
	toast.error(title, { description, duration });
}

/**
 * Build error result from network error
 */
export function buildNetworkError(): ErrorResult {
	return {
		title: ERROR_MESSAGES.NETWORK_ERROR.title,
		description: ERROR_MESSAGES.NETWORK_ERROR.description,
		code: "NETWORK_ERROR",
	};
}

/**
 * Build error result from error code and fallbacks
 */
export function buildErrorResult(
	errorCode: string,
	errorMessage: string,
	fallbackTitle: string,
	fallbackDescription: string,
): ErrorResult {
	const errorInfo =
		errorCode !== "UNKNOWN" ? ERROR_MESSAGES[errorCode] : undefined;
	return {
		title: errorInfo?.title || fallbackTitle,
		description: errorInfo?.description || errorMessage || fallbackDescription,
		code: errorCode,
	};
}
