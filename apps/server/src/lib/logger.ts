/**
 * Simple structured logging utility
 */

type LogLevel = "info" | "warn" | "error";

const isProduction = process.env.NODE_ENV === "production";

function formatTimestamp(): string {
	return new Date().toISOString();
}

function log(level: LogLevel, message: string, data?: unknown) {
	const timestamp = formatTimestamp();
	const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

	if (level === "error") {
		console.error(prefix, message, data || "");
	} else if (level === "warn") {
		console.warn(prefix, message, data || "");
	} else if (!isProduction) {
		// Only log info in development
		console.log(prefix, message, data || "");
	}
}

export const logger = {
	info: (message: string, data?: unknown) => log("info", message, data),
	warn: (message: string, data?: unknown) => log("warn", message, data),
	error: (message: string, data?: unknown) => log("error", message, data),
};
