import path from "node:path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const ReactCompilerConfig = {
	// Enable only in production to not slow down dev
	// Re-enabled after fixing chunking issues - the problem was manual chunking, not React Compiler
};

// Plugin to remove debug code injected by external tools (e.g., Cursor)
// The code is injected in functions like cn() in utils.ts
// Pattern observed: fetch("http://127.0.0.1:7242/ingest/55689669-9371-4ed0-be4d-b42defee24b9",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:"utils.ts:4",message:"cn function definition",...})}).catch(()=>{})
// This is a clean solution: removes the code completely using a precise regex
// Currently disabled - CSP allows 127.0.0.1:7242 to prevent errors
function _removeDebugCode(): Plugin {
	return {
		name: "remove-debug-code",
		enforce: "post",
		renderChunk(code, chunk) {
			if (!chunk.fileName.endsWith(".js")) {
				return null;
			}

			// Very precise pattern based on actual bundle content
			// Matches: fetch("http://127.0.0.1:7242/ingest/...",{method:"POST",headers:{...},body:JSON.stringify({...})}).catch(()=>{})
			// The key is matching the exact structure with nested JSON.stringify
			const pattern =
				/fetch\s*\(\s*["']http:\/\/127\.0\.0\.1:7242\/[^"']+["']\s*,\s*\{method:"POST",headers:\{[^}]*\},body:JSON\.stringify\(\{[^}]*\{[^}]*\}[^}]*\}\)\}\s*\)\s*\.catch\s*\(\s*\(\)\s*=>\s*\{\s*\}\s*\)\s*;?/g;

			let result = code.replace(pattern, "");

			// Also match simpler variations
			const simplePattern =
				/fetch\s*\(\s*["']http:\/\/127\.0\.0\.1:7242\/[^"']+["']\s*,\s*\{[^}]*\}\s*\)\s*\.catch\s*\(\s*\(\)\s*=>\s*\{\s*\}\s*\)\s*;?/g;
			result = result.replace(simplePattern, "");

			// Clean up orphaned punctuation
			result = result.replace(/,\s*,/g, ",").replace(/;\s*;/g, ";");

			return result !== code ? { code: result, map: chunk.map } : null;
		},
	};
}

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
					// Re-enabled: React Compiler is NOT the source of debug code
					plugins: [["babel-plugin-react-compiler", ReactCompilerConfig]],
				},
			}),
			// Debug code removal disabled - CSP allows 127.0.0.1:7242 to prevent errors
			// ...(mode === "production" ? [removeDebugCode()] : []),
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
					// Exclude HTML from precache to always get fresh CSP headers
					globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],
					cleanupOutdatedCaches: true,
					clientsClaim: true,
					skipWaiting: true,
					// Force cache version update - increment when CSP or other server headers change
					cacheId: "calendraft-v2",
					runtimeCaching: [
						{
							// Always fetch HTML from network to get fresh CSP headers
							urlPattern: /\.html$/,
							handler: "NetworkFirst",
							options: {
								cacheName: "html-cache",
								expiration: {
									maxEntries: 10,
									maxAgeSeconds: 60 * 60, // 1 hour
								},
								networkTimeoutSeconds: 10,
							},
						},
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
			minify: "esbuild", // Fast minification (swc not available in Vite 7)
			cssCodeSplit: true, // Split CSS for better caching
			chunkSizeWarningLimit: 1000, // Warn if chunk exceeds 1MB
			target: "esnext", // Modern browsers only
			// SIMPLIFIED: Let Vite handle chunking automatically
			// Manual chunking was causing initialization order issues with Radix UI
			// Vite's automatic chunking is smart enough to handle dependencies correctly
		},
	};
});
