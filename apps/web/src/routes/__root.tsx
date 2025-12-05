import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalFeatures } from "@/components/global-features";
import Header from "@/components/header";
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import { TourProvider } from "@/components/tour";
import { Toaster } from "@/components/ui/sonner";
import {
	isTourCompleted,
	markTourCompleted,
} from "@/hooks/use-calendraft-tour";
import type { trpc } from "@/utils/trpc";
import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

const BASE_URL = "https://calendraft.app";

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Calendraft - Manage your .ics calendars simply",
			},
			{
				name: "description",
				content:
					"Import, create, edit, and merge your ICS calendars in a few clicks. Compatible with Google Calendar, Apple Calendar, Outlook. Free and open-source.",
			},
			// Open Graph
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:url",
				content: BASE_URL,
			},
			{
				property: "og:title",
				content: "Calendraft - Manage your .ics calendars simply",
			},
			{
				property: "og:description",
				content:
					"Import, create, edit, and merge your ICS calendars in a few clicks. Free and open-source PWA application.",
			},
			{
				property: "og:image",
				content: `${BASE_URL}/og-image.png`,
			},
			{
				property: "og:locale",
				content: "en_US",
			},
			{
				property: "og:site_name",
				content: "Calendraft",
			},
			// Twitter Card
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: "Calendraft - Manage your .ics calendars simply",
			},
			{
				name: "twitter:description",
				content:
					"Import, create, edit, and merge your ICS calendars in a few clicks. Free and open-source PWA application.",
			},
			{
				name: "twitter:image",
				content: `${BASE_URL}/og-image.png`,
			},
			// Theme
			{
				name: "theme-color",
				content: "#18181b",
			},
		],
		links: [
			{
				rel: "canonical",
				href: BASE_URL,
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				sizes: "48x48",
			},
			{
				rel: "icon",
				href: "/pwa-192x192.png",
				type: "image/png",
				sizes: "192x192",
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon-180x180.png",
			},
		],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<TourProvider
					onComplete={markTourCompleted}
					onSkip={markTourCompleted}
					isTourCompleted={isTourCompleted()}
				>
					{/* Skip to main content link for keyboard navigation */}
					<a
						href="#main-content"
						className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
					>
						Skip to main content
					</a>
					<ErrorBoundary>
						<div className="flex min-h-svh flex-col">
							<Header />
							<main id="main-content" className="flex-1" tabIndex={-1}>
								<Outlet />
							</main>
						</div>
					</ErrorBoundary>
					<Toaster richColors />
					<PWAUpdatePrompt />
					<GlobalFeatures />
				</TourProvider>
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
