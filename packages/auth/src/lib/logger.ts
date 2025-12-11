/**
 * Simple logger for auth package
 * Uses console but with structured format
 */

import { env } from "./env";

const isProduction = env.NODE_ENV === "production";

function formatTimestamp(): string {
	return new Date().toISOString();
}

export const logger = {
	info: (message: string, data?: unknown) => {
		if (!isProduction) {
			const timestamp = formatTimestamp();
			console.log(`[${timestamp}] [INFO] [Auth]`, message, data || "");
		}
	},
	warn: (message: string, data?: unknown) => {
		const timestamp = formatTimestamp();
		console.warn(`[${timestamp}] [WARN] [Auth]`, message, data || "");
	},
	error: (message: string, data?: unknown) => {
		const timestamp = formatTimestamp();
		console.error(`[${timestamp}] [ERROR] [Auth]`, message, data || "");
	},
};
