import type { KnipConfig } from "knip";

const config: KnipConfig = {
	workspaces: {
		"apps/web": {
			entry: ["src/main.tsx"],
			project: ["src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}"],
		},
		"apps/server": {
			entry: ["src/index.ts"],
			project: ["src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}"],
		},
		"packages/*": {
			entry: ["src/index.ts"],
			project: ["src/**/*.{ts,tsx}", "!**/*.test.{ts,tsx}"],
		},
		"packages/config": {
			entry: [],
			project: [],
		},
	},
	ignore: [
		"**/routeTree.gen.ts",
		"**/*.config.ts",
		"**/tsdown.config.ts",
		"**/knip.config.ts",
		// Codacy config files
		".codacy/**",
		// Unused UI components from shadcn kept for future use
		"**/ui/dialog.tsx",
		"**/ui/slider.tsx",
		"**/ui/tabs.tsx",
		"**/ui/command.tsx",
		// Components kept for planned features
		"**/command-palette.tsx",
		"**/page-transition.tsx",
		"**/success-animation.tsx",
		"**/empty-state.tsx",
	],
	ignoreBinaries: ["tsc"],
	ignoreIssues: {
		// Logger utilities exported for external API use
		"apps/server/src/lib/logger.ts": ["exports", "types"],
		// PWA update utilities exported for manual trigger capability
		"apps/web/src/components/pwa-update-prompt.tsx": ["exports"],
		// UI components exported for external use
		"apps/web/src/components/ui/color-picker.tsx": ["exports"],
		"apps/web/src/components/template-selector.tsx": ["exports"],
		// Shadcn UI components exported for composition
		"apps/web/src/components/ui/alert-dialog.tsx": ["exports"],
		"apps/web/src/components/ui/badge.tsx": ["exports"],
		"apps/web/src/components/ui/calendar.tsx": ["exports"],
		"apps/web/src/components/ui/card.tsx": ["exports"],
		"apps/web/src/components/ui/dropdown-menu.tsx": ["exports"],
		"apps/web/src/components/ui/popover.tsx": ["exports"],
		"apps/web/src/components/ui/select.tsx": ["exports"],
		// Event form constants exported for validation
		"apps/web/src/lib/event-form-constants.ts": ["exports"],
		// Rate limit utilities
		"apps/server/src/middleware/rate-limit.ts": ["exports"],
		// Utility functions exported for external use
		"apps/web/src/lib/parse-trpc-errors.ts": ["exports"],
		"apps/web/src/lib/query-keys.ts": ["exports"],
		"apps/web/src/lib/search-params.ts": ["exports", "types"],
		"apps/web/src/lib/storage.ts": ["exports"],
		"apps/web/src/lib/tag-utils.ts": ["exports"],
		// Type exports for external use
		"apps/web/src/components/event-form-extended.tsx": ["types"],
		"apps/web/src/components/event-list-view.tsx": ["types"],
		"apps/web/src/components/recurrence-builder.tsx": ["types"],
		"apps/web/src/components/ui/form-message.tsx": ["types"],
		"apps/web/src/lib/alarm-parser.ts": ["types"],
		"apps/web/src/lib/error-handler/index.ts": ["types"],
		"apps/web/src/lib/event-presets.ts": ["types"],
		"apps/web/src/routes/__root.tsx": ["types"],
	},
	ignoreDependencies: [
		// Catalog dependencies used across workspaces
		"@trpc/client",
		"better-auth",
		"dotenv",
		"zod",
		"@prisma/client",
		// Dev dependencies used in config files
		"@calendraft/config",
		"postcss",
		// CSS-imported dependencies (not detected by knip)
		"tw-animate-css",
		"tailwindcss",
		"@fontsource-variable/jetbrains-mono",
		"@fontsource-variable/sora",
		// Babel plugin used in vite.config.ts (not detected by knip)
		"babel-plugin-react-compiler",
		// Command palette planned feature
		"cmdk",
		// Peer dependencies also in devDependencies for testing
		"@tanstack/react-query",
		// Used in seed files (not detected by knip)
		"@noble/hashes",
		// Core package used for types and utilities (may be used dynamically)
		"@calendraft/core",
		// Used in bunfig.toml for security scanning
		"bun-osv-scanner",
	],
};

export default config;
