import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/date/index.ts",
		"src/duration/index.ts",
		"src/alarm/index.ts",
		"src/parser/index.ts",
		"src/generator/index.ts",
	],
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
});
