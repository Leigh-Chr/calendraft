/**
 * Hook to get the previous value of a state
 */

import { useEffect, useRef } from "react";

/**
 * Get the previous value of a state or prop
 * @param value - Current value
 * @returns Previous value (undefined on first render)
 */
export function usePrevious<T>(value: T): T | undefined {
	const ref = useRef<T | undefined>(undefined);

	useEffect(() => {
		ref.current = value;
	}, [value]);

	return ref.current;
}
