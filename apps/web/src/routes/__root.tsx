import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ErrorBoundary } from "@/components/error-boundary";
import Header from "@/components/header";
import { PWAUpdatePrompt } from "@/components/pwa-update-prompt";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
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
				title: "Calendraft - Gérez vos calendriers .ics simplement",
			},
			{
				name: "description",
				content:
					"Importez, créez, modifiez et fusionnez vos calendriers ICS en quelques clics. Compatible Google Calendar, Apple Calendar, Outlook. Gratuit et open-source.",
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
				content: "Calendraft - Gérez vos calendriers .ics simplement",
			},
			{
				property: "og:description",
				content:
					"Importez, créez, modifiez et fusionnez vos calendriers ICS en quelques clics. Application PWA gratuite et open-source.",
			},
			{
				property: "og:image",
				content: `${BASE_URL}/og-image.png`,
			},
			{
				property: "og:locale",
				content: "fr_FR",
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
				content: "Calendraft - Gérez vos calendriers .ics simplement",
			},
			{
				name: "twitter:description",
				content:
					"Importez, créez, modifiez et fusionnez vos calendriers ICS en quelques clics. Application PWA gratuite et open-source.",
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
				<ErrorBoundary>
					<div className="flex min-h-svh flex-col">
						<Header />
						<main className="flex-1">
							<Outlet />
						</main>
					</div>
				</ErrorBoundary>
				<Toaster richColors />
				<PWAUpdatePrompt />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
