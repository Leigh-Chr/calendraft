import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const ReactCompilerConfig = {
	// Activer uniquement en production pour ne pas ralentir le dev
	// Désactiver cette ligne pour tester en dev
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackRouter({}),
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
			},
		}),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: [
				"favicon.ico",
				"apple-touch-icon-180x180.png",
				"pwa-64x64.png",
				"pwa-192x192.png",
				"pwa-512x512.png",
				"maskable-icon-512x512.png",
			],
			manifest: {
				name: "Calendraft",
				short_name: "Calendraft",
				description:
					"Créez, gérez et partagez vos calendriers ICS avec facilité",
				theme_color: "#0c0c0c",
				background_color: "#0c0c0c",
				display: "standalone",
				display_override: ["window-controls-overlay", "standalone"],
				orientation: "any",
				scope: "/",
				start_url: "/",
				lang: "fr",
				categories: ["productivity", "utilities"],
				icons: [
					{
						src: "pwa-64x64.png",
						sizes: "64x64",
						type: "image/png",
					},
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				shortcuts: [
					{
						name: "Nouveau calendrier",
						short_name: "Nouveau",
						description: "Créer un nouveau calendrier",
						url: "/calendars/new",
						icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
					},
					{
						name: "Mes calendriers",
						short_name: "Calendriers",
						description: "Voir tous mes calendriers",
						url: "/calendars",
						icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
					},
				],
			},
			pwaAssets: { disabled: false, config: true },
			devOptions: {
				enabled: true,
				suppressWarnings: true,
				type: "module",
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "gstatic-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
		// Sentry plugin for source maps upload (only in production builds)
		sentryVitePlugin({
			org: process.env.SENTRY_ORG,
			project: process.env.SENTRY_PROJECT,
			authToken: process.env.SENTRY_AUTH_TOKEN,
			sourcemaps: {
				filesToDeleteAfterUpload: ["./dist/**/*.map"],
			},
			// Disable plugin if no auth token (local development)
			disable: !process.env.SENTRY_AUTH_TOKEN,
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		sourcemap: true, // Required for Sentry source maps
	},
});
