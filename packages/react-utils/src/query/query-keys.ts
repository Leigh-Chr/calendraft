/**
 * Query key factory for React Query
 * Provides type-safe, consistent query key management
 */

/**
 * Create a query key factory for a domain
 * @param domain - The domain name (e.g., "calendar", "event")
 * @returns Query key factory functions
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
 * Default query keys for calendar domain
 */
export const calendarKeys = createQueryKeys("calendar");

/**
 * Default query keys for event domain
 */
export const eventKeys = createQueryKeys("event");

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
