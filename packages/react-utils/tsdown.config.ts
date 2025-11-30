import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/hooks/index.ts",
		"src/query/index.ts",
		"src/error/index.ts",
	],
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
	external: ["react", "@tanstack/react-query"],
});
