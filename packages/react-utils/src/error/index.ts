/**
 * Error handling exports
 */

export {
	createAppError,
	formatErrorForLog,
	getErrorCode,
	getErrorMessage,
	getErrorSeverity,
	isNetworkError,
	isTimeoutError,
	logErrorInDev,
} from "./helpers";
export type {
	AppError,
	ErrorContext,
	ErrorHandlerOptions,
	ErrorSeverity,
} from "./types";
