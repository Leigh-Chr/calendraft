/**
 * Simple structured logging utility with security event support
 */

type LogLevel = "info" | "warn" | "error" | "security";

const isProduction = process.env.NODE_ENV === "production";

function formatTimestamp(): string {
	return new Date().toISOString();
}

function log(level: LogLevel, message: string, data?: unknown) {
	const timestamp = formatTimestamp();
	const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

	if (level === "error") {
		console.error(prefix, message, data || "");
	} else if (level === "warn" || level === "security") {
		// Always log security events and warnings
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
	/**
	 * Log security-related events (rate limits, auth failures, etc.)
	 * These are always logged, even in production
	 */
	security: (message: string, data?: unknown) => log("security", message, data),
};

/**
 * Security event types for structured logging
 */
export type SecurityEventType =
	| "rate_limit_exceeded"
	| "auth_failure"
	| "forbidden_access"
	| "invalid_input"
	| "ssrf_blocked";

/**
 * Log a security event with structured data
 */
export function logSecurityEvent(
	event: SecurityEventType,
	details: {
		ip?: string;
		userId?: string;
		path?: string;
		reason?: string;
		[key: string]: unknown;
	},
) {
	logger.security(`[${event}]`, {
		event,
		...details,
		timestamp: new Date().toISOString(),
	});
}
