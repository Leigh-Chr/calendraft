import type { AppRouter } from "@calendraft/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { TRPCClientError } from "@trpc/client";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { handleTRPCError } from "@/lib/error-handler";
import { getAnonymousId } from "@/lib/storage";

/**
 * Check if error is a network error
 */
function isNetworkErrorType(error: unknown): boolean {
	if (error instanceof Error) {
		const message = error.message.toLowerCase();
		return (
			error.name === "NetworkError" ||
			error.name === "TypeError" ||
			message.includes("network") ||
			message.includes("fetch")
		);
	}
	return false;
}

/**
 * Handle UNAUTHORIZED errors by ensuring anonymous ID exists
 */
function handleUnauthorizedError(): boolean {
	if (typeof window === "undefined") return false;
	const anonymousId = getAnonymousId();
	return !!anonymousId;
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			// Check if this query should suppress error logging
			const suppressErrorLog =
				query.meta &&
				typeof query.meta === "object" &&
				"suppressErrorLog" in query.meta
					? (query.meta as { suppressErrorLog?: boolean }).suppressErrorLog ===
						true
					: false;

			// Handle network errors first (even without data property)
			if (isNetworkErrorType(error)) {
				handleTRPCError(error as TRPCClientError<AppRouter>, {
					fallbackTitle: "Network Error",
					fallbackDescription:
						"Unable to contact the server. Make sure the server is running and check your connection.",
					showToast: !suppressErrorLog,
					logError: !suppressErrorLog,
				});
				return;
			}

			// Handle tRPC errors with data property
			if (error && typeof error === "object" && "data" in error) {
				const trpcError = error as TRPCClientError<AppRouter>;

				// For UNAUTHORIZED errors in anonymous mode, ensure anonymous ID exists
				if (
					trpcError.data?.code === "UNAUTHORIZED" &&
					handleUnauthorizedError()
				) {
					// Retry the query after ensuring anonymous ID exists
					// The query will be retried automatically by React Query
					return;
				}

				// If error logging is suppressed, skip logging and toasts
				if (suppressErrorLog) {
					return;
				}

				handleTRPCError(trpcError, {
					fallbackTitle: "Request error",
					fallbackDescription: "An error occurred while retrieving data.",
					showToast: true,
				});
				return;
			}

			// Log other errors in development mode (unless suppressed)
			if (import.meta.env.DEV && !suppressErrorLog) {
				console.error("Query error:", error);
			}
		},
	}),
	defaultOptions: {
		queries: {
			retry: (failureCount, error: unknown) => {
				// Extract error code if available
				const errorData =
					error &&
					typeof error === "object" &&
					"data" in error &&
					error.data &&
					typeof error.data === "object" &&
					"code" in error.data
						? (error.data as { code: string })
						: null;

				// Special handling for UNAUTHORIZED errors in anonymous mode
				if (errorData?.code === "UNAUTHORIZED" && failureCount < 1) {
					// Ensure anonymous ID exists before retry
					if (typeof window !== "undefined") {
						getAnonymousId();
					}
					return true;
				}

				// Don't retry client errors (4xx) - these are user errors, not transient
				if (errorData?.code) {
					const clientErrorCodes = [
						"BAD_REQUEST",
						"UNAUTHORIZED",
						"FORBIDDEN",
						"NOT_FOUND",
						"CONFLICT",
					];
					if (clientErrorCodes.includes(errorData.code)) {
						return false;
					}
				}

				// Retry server errors and network errors (max 3 times)
				return failureCount < 3;
			},
			// Exponential backoff: 1s, 2s, 4s (max 30s)
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
		},
		mutations: {
			// Mutations should not be retried automatically
			// User actions should be explicit and not retried without user consent
			retry: false,
		},
	},
});

const serverUrl = import.meta.env["VITE_SERVER_URL"] || "http://localhost:3000";

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${serverUrl}/trpc`,
			fetch(url, options) {
				// Add anonymous ID header if user is not authenticated
				const headers = new Headers(options?.headers);

				// Get or create anonymous ID (creates it if it doesn't exist)
				if (typeof window !== "undefined") {
					const anonymousId = getAnonymousId();
					if (anonymousId) {
						headers.set("x-anonymous-id", anonymousId);
					}
				}

				return fetch(url, {
					...options,
					headers,
					credentials: "include",
				});
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
