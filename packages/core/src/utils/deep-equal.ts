/**
 * Deep equality and cloning utilities
 * Uses dequal for optimized deep comparison
 */

export { dequal as deepEqual } from "dequal";

/**
 * Create a shallow clone of an object
 */
export function shallowClone<T extends object>(obj: T): T {
	return { ...obj };
}

/**
 * Create a deep clone of an object
 * Uses structuredClone for modern, efficient deep cloning
 */
export function deepClone<T>(obj: T): T {
	return structuredClone(obj);
}
