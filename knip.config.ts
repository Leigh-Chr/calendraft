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
	},
	ignore: [
		"**/routeTree.gen.ts",
		"**/*.config.ts",
		"**/tsdown.config.ts",
		"**/knip.config.ts",
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
	ignoreBinaries: ["vitest"],
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
		"@fontsource-variable/geist",
		"@fontsource-variable/geist-mono",
		"tw-animate-css",
		"tailwindcss",
		// Command palette planned feature
		"cmdk",
		// Peer dependencies also in devDependencies for testing
		"@tanstack/react-query",
	],
};

export default config;
