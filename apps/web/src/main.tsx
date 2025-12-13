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
// biome-ignore lint/complexity/useLiteralKeys: import.meta.env uses index signature
const sentryDsn = import.meta.env["VITE_SENTRY_DSN"];
const isSentryEnabled = !!sentryDsn;
// biome-ignore lint/complexity/useLiteralKeys: import.meta.env uses index signature
const viteServerUrl = import.meta.env["VITE_SERVER_URL"];

// Use tunnel to bypass CSP restrictions - events are sent through the backend
const tunnelUrl = viteServerUrl
	? `${viteServerUrl}/api/sentry-tunnel`
	: undefined;

Sentry.init({
	dsn: sentryDsn,
	environment: import.meta.env.MODE,
	enabled: isSentryEnabled,

	// Use tunnel to bypass CSP restrictions
	...(tunnelUrl && { tunnel: tunnelUrl }),

	integrations: [
		Sentry.tanstackRouterBrowserTracingIntegration(router),
		Sentry.replayIntegration({
			maskAllText: false,
			blockAllMedia: false,
		}),
	],

	// Performance monitoring
	tracesSampleRate: import.meta.env.MODE === "production" ? 0.1 : 1.0,

	// Session Replay sampling
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,

	// Trace propagation for distributed tracing with backend
	tracePropagationTargets: [
		"localhost",
		/^https:\/\/.*\.calendraft\./,
		// biome-ignore lint/complexity/useLiteralKeys: import.meta.env uses index signature
		import.meta.env["VITE_API_URL"],
		viteServerUrl,
	].filter(Boolean),
});

// Expose Sentry test functions in console (for debugging)
if (typeof window !== "undefined") {
	(
		window as Window & {
			testSentry?: () => Promise<void>;
			checkSentry?: () => void;
		}
	).testSentry = async () => {
		if (!isSentryEnabled) {
			console.error("❌ Sentry is not enabled");
			return;
		}
		const eventId = Sentry.captureException(
			new Error("Test error from Sentry"),
			{ tags: { test: true } },
		);
		console.log("📤 Event captured:", eventId);
		const flushed = await Sentry.flush(5000);
		console.log(flushed ? "✅ Sent successfully" : "❌ Failed to send");
	};

	(
		window as Window & {
			testSentry?: () => Promise<void>;
			checkSentry?: () => void;
		}
	).checkSentry = () => {
		const client = Sentry.getClient();
		const options = client?.getOptions();
		console.log("Sentry:", {
			enabled: isSentryEnabled,
			tunnel: options?.tunnel || "not set",
		});
	};
}

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (rootElement.childNodes.length === 0) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
