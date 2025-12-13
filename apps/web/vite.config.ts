import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const ReactCompilerConfig = {
	// Enable only in production to not slow down dev
	// Re-enabled after fixing chunking issues - the problem was manual chunking, not React Compiler
};

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	const env = loadEnv(mode, process.cwd(), "");

	return {
		server: {
			port: 3001,
			strictPort: true,
			hmr: {
				protocol: "ws",
				host: "localhost",
			},
			proxy: {
				"/trpc": {
					target: env.VITE_SERVER_URL || "http://localhost:3000",
					changeOrigin: true,
					secure: false,
				},
				"/api": {
					target: env.VITE_SERVER_URL || "http://localhost:3000",
					changeOrigin: true,
					secure: false,
				},
			},
		},
		preview: {
			port: 3001,
			strictPort: true,
		},
		plugins: [
			tailwindcss(),
			tanstackRouter({
				exclude: ["**/__tests__/**", "**/*.test.tsx", "**/*.test.ts"],
			}),
			react({
				babel: {
					// Re-enabled after fixing chunking issues - the problem was manual chunking, not React Compiler
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
					"og-image.png",
					"robots.txt",
					"sitemap.xml",
				],
				manifest: {
					name: "Calendraft",
					short_name: "Calendraft",
					description:
						"Import, create, edit, and merge your ICS calendars. Compatible with Google Calendar, Apple Calendar, Outlook.",
					theme_color: "#18181b",
					background_color: "#18181b",
					display: "standalone",
					display_override: ["window-controls-overlay", "standalone"],
					orientation: "any",
					scope: "/",
					start_url: "/",
					lang: "en",
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
							name: "New calendar",
							short_name: "New",
							description: "Create a new calendar",
							url: "/calendars/new",
							icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
						},
						{
							name: "My calendars",
							short_name: "Calendars",
							description: "View all my calendars",
							url: "/calendars",
							icons: [{ src: "pwa-192x192.png", sizes: "192x192" }],
						},
					],
				},
				pwaAssets: { disabled: false, config: true },
				devOptions: {
					enabled: mode === "development",
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
				org: env.SENTRY_ORG,
				project: env.SENTRY_PROJECT,
				authToken: env.SENTRY_AUTH_TOKEN,
				sourcemaps: {
					filesToDeleteAfterUpload: ["./dist/**/*.map"],
				},
				// Disable plugin if no auth token (local development)
				disable: !env.SENTRY_AUTH_TOKEN,
			}),
		],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
			// CRITICAL: Deduplicate React to prevent "Invalid hook call" errors
			// This ensures all dependencies use the same React instance
			dedupe: ["react", "react-dom"],
		},
		optimizeDeps: {
			// SIMPLIFIED: Only pre-bundle React to ensure single instance
			// Let Vite handle Radix UI dependencies automatically
			// This avoids complex dependency resolution issues
			include: ["react", "react-dom"],
		},
		build: {
			sourcemap: true, // Required for Sentry source maps
			minify: "esbuild", // Fast and efficient minification
			cssCodeSplit: true, // Split CSS for better caching
			chunkSizeWarningLimit: 1000, // Warn if chunk exceeds 1MB
			target: "esnext", // Modern browsers only
			// SIMPLIFIED: Let Vite handle chunking automatically
			// Manual chunking was causing initialization order issues with Radix UI
			// Vite's automatic chunking is smart enough to handle dependencies correctly
		},
	};
});
