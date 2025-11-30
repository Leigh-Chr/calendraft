/**
 * Centralized error handling utilities
 * Follows best practices for error handling in tRPC + React Query applications
 */

import type { AppRouter } from "@calendraft/api/routers/index";
import type { TRPCClientError, TRPCClientErrorLike } from "@trpc/client";
import {
	buildErrorResult,
	buildNetworkError,
	getErrorMessage,
	getTRPCErrorCode,
	isNetworkError,
	logErrorDetails,
	showErrorToast,
} from "./helpers";
import type { ErrorResult, HandleErrorOptions } from "./types";

// Re-export types
export type { ErrorResult, HandleErrorOptions } from "./types";

/**
 * Handle tRPC client errors with proper typing and user-friendly messages
 */
export function handleTRPCError(
	error: TRPCClientErrorLike<AppRouter> | TRPCClientError<AppRouter>,
	options?: HandleErrorOptions,
): ErrorResult {
	const {
		fallbackTitle = "Erreur",
		fallbackDescription = "Une erreur est survenue",
		showToast = true,
		logError = true,
	} = options || {};

	if (logError) {
		logErrorDetails(error);
	}

	if (isNetworkError(error)) {
		const result = buildNetworkError();
		if (showToast) {
			showErrorToast(result.title, result.description, 8000);
		}
		return result;
	}

	const errorCode = getTRPCErrorCode(error);
	const errorMessage = getErrorMessage(error);
	const result = buildErrorResult(
		errorCode,
		errorMessage,
		fallbackTitle,
		fallbackDescription,
	);

	if (showToast) {
		showErrorToast(result.title, result.description);
	}

	return result;
}
