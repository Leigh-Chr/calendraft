/**
 * Error handling types
 */

export interface AppError {
	code: string;
	message: string;
	details?: Record<string, unknown>;
	timestamp: Date;
}

export interface ErrorHandlerOptions {
	/** Whether to log the error to console (only in dev) */
	logError?: boolean;
	/** Custom error title */
	fallbackTitle?: string;
	/** Custom error description */
	fallbackDescription?: string;
	/** Whether to show a toast notification */
	showToast?: boolean;
}

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export interface ErrorContext {
	/** Component or function where error occurred */
	source?: string;
	/** User-facing action that triggered the error */
	action?: string;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
}
