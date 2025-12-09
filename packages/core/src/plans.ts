// SPDX-License-Identifier: MIT
/**
 * @calendraft/core
 * User limits - Both anonymous and authenticated users have limits
 * Authenticated users have generous limits, anonymous users have stricter ones
 */

/**
 * Limits applied to anonymous (non-authenticated) users
 */
export const ANONYMOUS_LIMITS = {
	calendars: 10,
	eventsPerCalendar: 500,
	groups: 50, // Increased limit for simple groups (tags) + advanced groups
	calendarsPerGroup: 15, // Increased limit
} as const;

/**
 * Limits applied to authenticated users
 * Generous limits to cover 99.9% of legitimate use cases
 */
export const AUTHENTICATED_LIMITS = {
	calendars: 100,
	eventsPerCalendar: 2000,
	groups: 100, // Increased limit for simple groups (tags) + advanced groups
	calendarsPerGroup: 20, // Increased limit
} as const;

export type AnonymousLimits = typeof ANONYMOUS_LIMITS;
export type AuthenticatedLimits = typeof AUTHENTICATED_LIMITS;

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
	const limit = isAuth
		? AUTHENTICATED_LIMITS.calendars
		: ANONYMOUS_LIMITS.calendars;
	return currentCount >= limit;
}

/**
 * Check if user has reached event limit for a calendar
 * Returns true if limit is reached (user cannot create more)
 */
export function hasReachedEventLimit(
	isAuth: boolean,
	currentCount: number,
): boolean {
	const limit = isAuth
		? AUTHENTICATED_LIMITS.eventsPerCalendar
		: ANONYMOUS_LIMITS.eventsPerCalendar;
	return currentCount >= limit;
}

/**
 * Get the maximum number of calendars for a user
 */
export function getMaxCalendars(isAuth: boolean): number {
	return isAuth ? AUTHENTICATED_LIMITS.calendars : ANONYMOUS_LIMITS.calendars;
}

/**
 * Get the maximum number of events per calendar for a user
 */
export function getMaxEventsPerCalendar(isAuth: boolean): number {
	return isAuth
		? AUTHENTICATED_LIMITS.eventsPerCalendar
		: ANONYMOUS_LIMITS.eventsPerCalendar;
}

/**
 * Check if user has reached group limit
 * Returns true if limit is reached (user cannot create more)
 */
export function hasReachedGroupLimit(
	isAuth: boolean,
	currentCount: number,
): boolean {
	const limit = isAuth ? AUTHENTICATED_LIMITS.groups : ANONYMOUS_LIMITS.groups;
	return currentCount >= limit;
}

/**
 * Get the maximum number of groups for a user
 */
export function getMaxGroups(isAuth: boolean): number {
	return isAuth ? AUTHENTICATED_LIMITS.groups : ANONYMOUS_LIMITS.groups;
}

/**
 * Get the maximum number of calendars per group for a user
 */
export function getMaxCalendarsPerGroup(isAuth: boolean): number {
	return isAuth
		? AUTHENTICATED_LIMITS.calendarsPerGroup
		: ANONYMOUS_LIMITS.calendarsPerGroup;
}
