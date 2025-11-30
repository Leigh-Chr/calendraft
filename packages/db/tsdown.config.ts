import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "src/index.ts",
	sourcemap: true,
	// dts disabled due to Prisma 7 generated types issue with @prisma/client-runtime-utils
	// Types are exported directly from src via package.json exports
	dts: false,
});
