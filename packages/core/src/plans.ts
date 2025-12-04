// SPDX-License-Identifier: MIT
/**
 * @calendraft/core
 * User limits - Anonymous users have limits, authenticated users have none
 */

/**
 * Limits applied to anonymous (non-authenticated) users
 */
export const ANONYMOUS_LIMITS = {
	calendars: 10,
	eventsPerCalendar: 500,
} as const;

export type AnonymousLimits = typeof ANONYMOUS_LIMITS;

/**
 * Check if a user is authenticated (has a session)
 */
export function isAuthenticated(
	sessionUserId: string | null | undefined,
): boolean {
	return !!sessionUserId;
}

/**
 * Check if user has reached calendar limit
 * Returns true if limit is reached (user cannot create more)
 */
export function hasReachedCalendarLimit(
	isAuth: boolean,
	currentCount: number,
): boolean {
	if (isAuth) return false; // Authenticated users have no limits
	return currentCount >= ANONYMOUS_LIMITS.calendars;
}

/**
 * Check if user has reached event limit for a calendar
 * Returns true if limit is reached (user cannot create more)
 */
export function hasReachedEventLimit(
	isAuth: boolean,
	currentCount: number,
): boolean {
	if (isAuth) return false; // Authenticated users have no limits
	return currentCount >= ANONYMOUS_LIMITS.eventsPerCalendar;
}

/**
 * Get the maximum number of calendars for a user
 * Returns -1 for unlimited (authenticated users)
 */
export function getMaxCalendars(isAuth: boolean): number {
	return isAuth ? -1 : ANONYMOUS_LIMITS.calendars;
}

/**
 * Get the maximum number of events per calendar for a user
 * Returns -1 for unlimited (authenticated users)
 */
export function getMaxEventsPerCalendar(isAuth: boolean): number {
	return isAuth ? -1 : ANONYMOUS_LIMITS.eventsPerCalendar;
}
