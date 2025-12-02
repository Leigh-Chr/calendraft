/**
 * Centralized React Query keys
 * Eliminates magic strings and provides type-safe query key management
 */

export const QUERY_KEYS = {
	// Calendar queries
	calendar: {
		all: [["calendar"]] as const,
		list: [["calendar", "list"]] as const,
		byId: (id: string) => [["calendar", "getById"], { id }] as const,
		usage: [["calendar", "getUsage"]] as const,
	},

	// Event queries
	event: {
		all: [["event"]] as const,
		list: (calendarId?: string) =>
			calendarId
				? ([["event", "list"], { calendarId }] as const)
				: ([["event", "list"]] as const),
		byId: (id: string) => [["event", "getById"], { id }] as const,
	},

	// Share link queries
	share: {
		all: [["share"]] as const,
		byCalendar: (calendarId: string) =>
			[["share", "list"], { calendarId }] as const,
		byToken: (token: string) => [["share", "getByToken"], { token }] as const,
		infoByToken: (token: string) =>
			[["share", "getInfoByToken"], { token }] as const,
	},

	// Auth queries
	auth: {
		session: [["auth", "session"]] as const,
		privateData: [["privateData"]] as const,
	},
} as const;

/**
 * Helper to invalidate all calendar-related queries
 */
export function getCalendarInvalidationKeys() {
	return [QUERY_KEYS.calendar.list, QUERY_KEYS.calendar.all];
}

/**
 * Helper to invalidate all event-related queries
 */
export function getEventInvalidationKeys() {
	return [QUERY_KEYS.event.all];
}

/**
 * Helper to invalidate queries after event mutation
 */
export function getEventMutationInvalidationKeys(calendarId?: string) {
	return [
		QUERY_KEYS.event.all,
		QUERY_KEYS.calendar.list,
		...(calendarId ? [QUERY_KEYS.calendar.byId(calendarId)] : []),
	];
}
