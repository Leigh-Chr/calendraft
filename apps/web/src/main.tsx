import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import type * as React from "react";
import ReactDOM from "react-dom/client";
import Loader from "./components/loader";
import { getAnonymousId } from "./lib/storage";
import { routeTree } from "./routeTree.gen";
import { queryClient, trpc } from "./utils/trpc";

// Initialize anonymous ID at app startup to ensure it exists before any API calls
// This is critical for private browsing mode where localStorage starts empty
if (typeof window !== "undefined") {
	getAnonymousId();
}

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPendingComponent: () => <Loader />,
	context: { trpc, queryClient },
	Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

// Initialize Sentry for error tracking and performance monitoring
Sentry.init({
	dsn: import.meta.env.VITE_SENTRY_DSN,
	environment: import.meta.env.MODE,
	enabled: !!import.meta.env.VITE_SENTRY_DSN,

	integrations: [
		// TanStack Router integration for route-based performance tracing
		Sentry.tanstackRouterBrowserTracingIntegration(router),
		// Session replay for debugging user sessions with errors
		Sentry.replayIntegration({
			maskAllText: false,
			blockAllMedia: false,
		}),
	],

	// Performance monitoring - adjust in production
	tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,

	// Session Replay sampling
	replaysSessionSampleRate: 0.1, // 10% of sessions
	replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

	// Trace propagation for distributed tracing with backend
	tracePropagationTargets: [
		"localhost",
		/^https:\/\/.*\.calendraft\./,
		import.meta.env.VITE_API_URL,
	].filter(Boolean),
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

// Check if root is empty by checking child nodes instead of innerHTML
// This is safer and avoids XSS concerns
if (rootElement.childNodes.length === 0) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
