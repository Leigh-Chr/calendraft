/**
 * Media query convenience hooks
 * Wraps usehooks-ts useMediaQuery with common breakpoints
 */

import { useMediaQuery } from "usehooks-ts";

/**
 * Check if viewport is mobile (<768px)
 */
export function useIsMobile(): boolean {
	return !useMediaQuery("(min-width: 768px)");
}

/**
 * Check if viewport is tablet (768px - 1023px)
 */
export function useIsTablet(): boolean {
	return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

/**
 * Check if viewport is desktop (≥1024px)
 */
export function useIsDesktop(): boolean {
	return useMediaQuery("(min-width: 1024px)");
}

/**
 * Check if user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
	return useMediaQuery("(prefers-color-scheme: dark)");
}

/**
 * Check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
	return useMediaQuery("(prefers-reduced-motion: reduce)");
}
