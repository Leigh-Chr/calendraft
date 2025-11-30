/**
 * @calendraft/react-utils
 * React utilities and hooks for Calendraft applications
 */

// Error handling
export type {
	AppError,
	ErrorContext,
	ErrorHandlerOptions,
	ErrorSeverity,
} from "./error";
export {
	createAppError,
	formatErrorForLog,
	getErrorCode,
	getErrorMessage,
	getErrorSeverity,
	isNetworkError,
	isTimeoutError,
	logErrorInDev,
} from "./error";
// Hooks
export {
	useDebounce,
	useIsDesktop,
	useIsMobile,
	useIsMounted,
	useIsTablet,
	useLocalStorage,
	useMediaQuery,
	useMounted,
	usePrefersDarkMode,
	usePrefersReducedMotion,
	usePrevious,
} from "./hooks";
// Query utilities
export { createQueryKeys, queryKeyUtils } from "./query";

// Utility functions
export { cn } from "./utils/cn";
