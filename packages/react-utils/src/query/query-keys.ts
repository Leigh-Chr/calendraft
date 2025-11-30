/**
 * Query key factory for React Query
 * Provides type-safe, consistent query key management
 *
 * Note: This is a generic utility for creating query keys.
 * For Calendraft-specific query keys, see apps/web/src/lib/query-keys.ts
 */

/**
 * Create a query key factory for a domain
 * @param domain - The domain name (e.g., "calendar", "event")
 * @returns Query key factory functions
 *
 * @example
 * const userKeys = createQueryKeys("user");
 * userKeys.all; // ["user"]
 * userKeys.list(); // ["user", "list"]
 * userKeys.detail("123"); // ["user", "detail", "123"]
 */
export function createQueryKeys<T extends string>(domain: T) {
	return {
		all: [domain] as const,
		lists: () => [domain, "list"] as const,
		list: (filters?: Record<string, unknown>) =>
			[domain, "list", filters ?? {}] as const,
		details: () => [domain, "detail"] as const,
		detail: (id: string) => [domain, "detail", id] as const,
	};
}

/**
 * Query key utilities
 */
export const queryKeyUtils = {
	/**
	 * Check if a query key matches a prefix
	 */
	matches: (
		queryKey: readonly unknown[],
		prefix: readonly unknown[],
	): boolean => {
		if (queryKey.length < prefix.length) return false;
		return prefix.every((key, index) => {
			if (typeof key === "object" && key !== null) {
				return JSON.stringify(key) === JSON.stringify(queryKey[index]);
			}
			return key === queryKey[index];
		});
	},
};
