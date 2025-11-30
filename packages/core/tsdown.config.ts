import { defineConfig } from "tsdown";

export default defineConfig({
	entry: [
		"src/index.ts",
		"src/types/index.ts",
		"src/utils/index.ts",
		"src/validation/index.ts",
		"src/constants/index.ts",
	],
	format: ["esm"],
	dts: true,
	clean: true,
	sourcemap: true,
});
