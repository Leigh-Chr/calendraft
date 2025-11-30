/**
 * Legacy compatibility wrapper for useMounted
 * New code should use useIsMounted from usehooks-ts directly
 */

import { useIsMounted } from "usehooks-ts";

/**
 * @deprecated Use useIsMounted from usehooks-ts instead
 * Get a function that returns whether the component is still mounted
 */
export function useMounted(): () => boolean {
	return useIsMounted();
}
