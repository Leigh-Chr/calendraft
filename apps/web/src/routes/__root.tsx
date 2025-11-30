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

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{
				title: "Calendraft",
			},
			{
				name: "description",
				content:
					"Calendraft - Créez, gérez et partagez vos calendriers ICS avec facilité",
			},
			{
				name: "theme-color",
				content: "#18181b",
			},
		],
		links: [
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
