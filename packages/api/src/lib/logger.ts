/**
 * Simple logger for API package
 * Uses console but with structured format
 */

const isProduction = process.env["NODE_ENV"] === "production";

function formatTimestamp(): string {
	return new Date().toISOString();
}

export const logger = {
	info: (message: string, data?: unknown) => {
		if (!isProduction) {
			const timestamp = formatTimestamp();
			console.log(`[${timestamp}] [INFO] [API]`, message, data || "");
		}
	},
	warn: (message: string, data?: unknown) => {
		const timestamp = formatTimestamp();
		console.warn(`[${timestamp}] [WARN] [API]`, message, data || "");
	},
	error: (message: string, data?: unknown) => {
		const timestamp = formatTimestamp();
		console.error(`[${timestamp}] [ERROR] [API]`, message, data || "");
	},
};
