/**
 * Error handler type definitions
 */

export interface ErrorInfo {
	title: string;
	description: string;
}

export interface ErrorResult {
	title: string;
	description: string;
	code: string;
}

export interface HandleErrorOptions {
	fallbackTitle?: string;
	fallbackDescription?: string;
	showToast?: boolean;
	logError?: boolean;
}
