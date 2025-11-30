/**
 * React hooks exports
 * Re-exports from usehooks-ts for well-tested, maintained implementations
 * Custom hooks for specific needs not covered by usehooks-ts
 */

// Re-export from usehooks-ts
export {
	useDebounceValue as useDebounce,
	useIsMounted,
	useLocalStorage,
	useMediaQuery,
} from "usehooks-ts";

// Custom hooks for convenience wrappers
export {
	useIsDesktop,
	useIsMobile,
	useIsTablet,
	usePrefersDarkMode,
	usePrefersReducedMotion,
} from "./use-media-query";
// Legacy alias for backwards compatibility
export { useMounted } from "./use-mounted";
// Custom hook not available in usehooks-ts
export { usePrevious } from "./use-previous";
