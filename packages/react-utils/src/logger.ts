/**
 * Simple logger for react-utils package
 * Uses console in development only
 */

// Use import.meta.env for Vite compatibility (browser environment)
// Fallback to checking if we're in a Node.js environment
const isProduction = (() => {
	// Check Vite's import.meta.env first (browser environment)
	if (typeof import.meta !== "undefined" && import.meta.env) {
		// biome-ignore lint/complexity/useLiteralKeys: Environment variable access (project rule)
		const mode = import.meta.env["MODE"];
		// biome-ignore lint/complexity/useLiteralKeys: Environment variable access (project rule)
		const prod = import.meta.env["PROD"];
		return mode === "production" || Boolean(prod);
	}
	// Fallback to Node.js process.env (server-side)
	try {
		// Use try-catch to safely access process in case it's not defined
		if (typeof process !== "undefined" && process.env) {
			return process.env.NODE_ENV === "production";
		}
	} catch {
		// process is not available (browser environment without import.meta.env)
		// Default to development mode for safety
		return false;
	}
	return false;
})();

function formatTimestamp(): string {
	return new Date().toISOString();
}

export const logger = {
	info: (message: string, data?: unknown) => {
		if (!isProduction) {
			const timestamp = formatTimestamp();
			console.log(`[${timestamp}] [INFO] [ReactUtils]`, message, data || "");
		}
	},
	warn: (message: string, data?: unknown) => {
		const timestamp = formatTimestamp();
		console.warn(`[${timestamp}] [WARN] [ReactUtils]`, message, data || "");
	},
	error: (message: string, data?: unknown) => {
		const timestamp = formatTimestamp();
		console.error(`[${timestamp}] [ERROR] [ReactUtils]`, message, data || "");
	},
};
