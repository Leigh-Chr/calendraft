/**
 * Calendar sorting utilities
 */

import type {
	CalendarSortBy,
	CalendarSortDirection,
} from "@/components/calendar-list/calendar-filters";

export type CalendarForSort = {
	id: string;
	name: string;
	updatedAt?: string | Date | null;
	createdAt?: string | Date | null;
	eventCount: number;
	color?: string | null;
	sourceUrl?: string | null;
	lastSyncedAt?: string | Date | null;
	events?: Array<{
		id: string;
		title: string;
		startDate: string | Date;
	}>;
};

/**
 * Compare dates for sorting
 */
function compareDates(
	a: string | Date | null | undefined,
	b: string | Date | null | undefined,
	direction: CalendarSortDirection,
): number {
	const aTime = a ? new Date(a).getTime() : 0;
	const bTime = b ? new Date(b).getTime() : 0;
	return direction === "asc" ? aTime - bTime : bTime - aTime;
}

/**
 * Sort calendars by name
 */
function sortByName(a: CalendarForSort, b: CalendarForSort): number {
	return a.name.localeCompare(b.name);
}

/**
 * Sort calendars by updated date
 */
function sortByUpdatedAt(
	a: CalendarForSort,
	b: CalendarForSort,
	direction: CalendarSortDirection,
): number {
	return compareDates(a.updatedAt, b.updatedAt, direction);
}

/**
 * Sort calendars by created date
 */
function sortByCreatedAt(
	a: CalendarForSort,
	b: CalendarForSort,
	direction: CalendarSortDirection,
): number {
	return compareDates(a.createdAt, b.createdAt, direction);
}

/**
 * Sort calendars by event count
 */
function sortByEventCount(a: CalendarForSort, b: CalendarForSort): number {
	return a.eventCount - b.eventCount;
}

/**
 * Sort calendars by the specified criteria
 */
export function sortCalendars(
	calendars: CalendarForSort[],
	sortBy: CalendarSortBy,
	sortDirection: CalendarSortDirection,
): CalendarForSort[] {
	const sorted = [...calendars];
	if (sortBy === "name") {
		sorted.sort(sortByName);
	} else if (sortBy === "updatedAt") {
		sorted.sort((a, b) => sortByUpdatedAt(a, b, sortDirection));
	} else if (sortBy === "createdAt") {
		sorted.sort((a, b) => sortByCreatedAt(a, b, sortDirection));
	} else if (sortBy === "eventCount") {
		sorted.sort(sortByEventCount);
	}
	return sorted;
}

/**
 * Filter calendars by keyword
 */
export function filterCalendarsByKeyword(
	calendars: CalendarForSort[],
	keyword: string,
): CalendarForSort[] {
	if (!keyword.trim()) {
		return calendars;
	}
	const searchLower = keyword.trim().toLowerCase();
	return calendars.filter((cal) =>
		cal.name.toLowerCase().includes(searchLower),
	);
}
