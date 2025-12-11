/**
 * Simple logger for react-utils package
 * Uses console in development only
 */

// biome-ignore lint/complexity/useLiteralKeys: Environment variable access (project rule: use bracket notation)
const isProduction = process.env["NODE_ENV"] === "production";

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
