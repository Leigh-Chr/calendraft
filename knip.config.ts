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
	],
	ignoreBinaries: ["tsdown"],
	ignoreDependencies: [
		"@types/bun",
		"@types/node",
		// Catalog dependencies used across workspaces
		"hono",
		"@trpc/server",
		"@trpc/client",
		"better-auth",
		"dotenv",
		"zod",
		"typescript",
		"tsdown",
		"@prisma/client",
		"@polar-sh/better-auth",
		// Dev dependencies used in config files
		"@calendraft/config",
		"postcss",
		// Binaries used in test files
		"vitest",
	],
};

export default config;
