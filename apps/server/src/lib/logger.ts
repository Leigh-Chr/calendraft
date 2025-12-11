/**
 * Structured logging utility with correlation IDs and security event support
 */

import { randomBytes } from "node:crypto";

type LogLevel = "info" | "warn" | "error" | "security";

// biome-ignore lint/complexity/useLiteralKeys: Environment variable access (project rule: use bracket notation)
const isProduction = process.env["NODE_ENV"] === "production";

/**
 * Generate a correlation ID for request tracking
 */
export function generateCorrelationId(): string {
	return randomBytes(16).toString("hex");
}

/**
 * Context for structured logging
 */
export interface LogContext {
	correlationId?: string;
	userId?: string;
	ip?: string;
	path?: string;
	method?: string;
	[key: string]: unknown;
}

/**
 * Global context store (AsyncLocalStorage would be better, but this works for now)
 */
const contextStore = new Map<string, LogContext>();

/**
 * Set context for current execution (should be called per request)
 */
export function setLogContext(correlationId: string, context: LogContext) {
	contextStore.set(correlationId, { correlationId, ...context });
}

/**
 * Get context for current execution
 */
export function getLogContext(correlationId?: string): LogContext | undefined {
	if (!correlationId) return undefined;
	return contextStore.get(correlationId);
}

/**
 * Clear context (should be called after request completes)
 */
export function clearLogContext(correlationId: string) {
	contextStore.delete(correlationId);
}

/**
 * Format structured log entry
 */
function formatLogEntry(
	level: LogLevel,
	message: string,
	data?: unknown,
	context?: LogContext,
): string {
	const timestamp = new Date().toISOString();
	const entry: Record<string, unknown> = {
		timestamp,
		level: level.toUpperCase(),
		message,
		...(context || {}),
		...(typeof data === "object" && data !== null ? data : { data }),
	};

	// Format as JSON for structured logging (better for log aggregation tools)
	if (isProduction) {
		return JSON.stringify(entry);
	}

	// Pretty format for development
	const contextStr = context
		? ` [${context.correlationId || ""}${context.userId ? ` user:${context.userId}` : ""}${context.path ? ` ${context.method || "GET"} ${context.path}` : ""}]`
		: "";
	return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message} ${data ? JSON.stringify(data, null, 2) : ""}`;
}

function log(
	level: LogLevel,
	message: string,
	data?: unknown,
	context?: LogContext,
) {
	const formatted = formatLogEntry(level, message, data, context);

	if (level === "error") {
		console.error(formatted);
	} else if (level === "warn" || level === "security") {
		// Always log security events and warnings
		console.warn(formatted);
	} else if (!isProduction) {
		// Only log info in development
		console.log(formatted);
	}
}

export const logger = {
	info: (message: string, data?: unknown, context?: LogContext) =>
		log("info", message, data, context),
	warn: (message: string, data?: unknown, context?: LogContext) =>
		log("warn", message, data, context),
	error: (message: string, data?: unknown, context?: LogContext) =>
		log("error", message, data, context),
	/**
	 * Log security-related events (rate limits, auth failures, etc.)
	 * These are always logged, even in production
	 */
	security: (message: string, data?: unknown, context?: LogContext) =>
		log("security", message, data, context),
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
		correlationId?: string;
		[key: string]: unknown;
	},
) {
	logger.security(
		`[${event}]`,
		{
			event,
			...details,
			timestamp: new Date().toISOString(),
		},
		details.correlationId ? getLogContext(details.correlationId) : undefined,
	);
}
