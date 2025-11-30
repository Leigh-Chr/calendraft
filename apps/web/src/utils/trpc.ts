import type { AppRouter } from "@calendraft/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { TRPCClientError } from "@trpc/client";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { handleTRPCError } from "@/lib/error-handler";
import { getAnonymousId } from "@/lib/storage";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			// Only handle tRPC errors here, component-level errors are handled in hooks
			if (error && typeof error === "object" && "data" in error) {
				const trpcError = error as TRPCClientError<AppRouter>;

				// For UNAUTHORIZED errors in anonymous mode, ensure anonymous ID exists
				// This handles edge cases where localStorage might have been cleared
				if (
					trpcError.data?.code === "UNAUTHORIZED" &&
					typeof window !== "undefined"
				) {
					const anonymousId = getAnonymousId();
					if (anonymousId) {
						// Retry the query after ensuring anonymous ID exists
						// The query will be retried automatically by React Query
						return;
					}
				}

				handleTRPCError(trpcError, {
					fallbackTitle: "Erreur de requête",
					fallbackDescription:
						"Une erreur est survenue lors de la récupération des données.",
					showToast: true,
				});
			} else if (import.meta.env.DEV) {
				// Only log in development mode
				console.error("Query error:", error);
			}
		},
	}),
	defaultOptions: {
		queries: {
			retry: (failureCount, error: unknown) => {
				// Retry once for UNAUTHORIZED errors in case anonymous ID wasn't initialized
				const errorData =
					error &&
					typeof error === "object" &&
					"data" in error &&
					error.data &&
					typeof error.data === "object" &&
					"code" in error.data
						? (error.data as { code: string })
						: null;
				if (errorData?.code === "UNAUTHORIZED" && failureCount < 1) {
					// Ensure anonymous ID exists before retry
					if (typeof window !== "undefined") {
						getAnonymousId();
					}
					return true;
				}
				// Default retry behavior for other errors
				return failureCount < 3;
			},
		},
	},
});

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

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
