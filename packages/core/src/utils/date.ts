/**
 * Pure date utility functions
 * No external dependencies beyond date-fns
 */

import {
	addDays,
	addHours,
	addMinutes as dfnsAddMinutes,
	differenceInMinutes,
	format,
} from "date-fns";

/**
 * Normalize a date value to Date object
 */
export function normalizeDate(date: Date | string): Date {
	return date instanceof Date ? date : new Date(date);
}

/**
 * Check if a value is a valid Date
 */
export function isValidDate(date: unknown): date is Date {
	return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Format a date for HTML datetime-local input
 */
export function toDateTimeLocal(date: Date | string): string {
	const dateObj = normalizeDate(date);
	return format(dateObj, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format a date for display (short format)
 * Uses ISO 8601 date format for universal compatibility
 */
export function formatDateShort(date: Date | string): string {
	const dateObj = normalizeDate(date);
	return format(dateObj, "yyyy-MM-dd HH:mm");
}

/**
 * Add minutes to a date
 */
export function addMinutesToDate(date: Date | string, minutes: number): Date {
	return dfnsAddMinutes(normalizeDate(date), minutes);
}

/**
 * Add hours to a date
 */
export function addHoursToDate(date: Date | string, hours: number): Date {
	return addHours(normalizeDate(date), hours);
}

/**
 * Add days to a date
 */
export function addDaysToDate(date: Date | string, days: number): Date {
	return addDays(normalizeDate(date), days);
}

/**
 * Get duration between two dates in minutes
 */
export function getDurationMinutes(
	start: Date | string,
	end: Date | string,
): number {
	return differenceInMinutes(normalizeDate(end), normalizeDate(start));
}

/**
 * Format duration between two dates as a human-readable string
 */
export function formatEventDuration(
	start: Date | string,
	end: Date | string,
): string {
	const minutes = getDurationMinutes(start, end);
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;

	if (hours > 0) {
		return `${hours}h${mins > 0 ? ` ${mins}min` : ""}`;
	}
	return `${mins}min`;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date | string, date2: Date | string): boolean {
	const d1 = normalizeDate(date1);
	const d2 = normalizeDate(date2);
	return (
		d1.getFullYear() === d2.getFullYear() &&
		d1.getMonth() === d2.getMonth() &&
		d1.getDate() === d2.getDate()
	);
}

/**
 * Get the start of a day (00:00:00)
 */
export function startOfDay(date: Date | string): Date {
	const d = normalizeDate(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Get the end of a day (23:59:59)
 */
export function endOfDay(date: Date | string): Date {
	const d = normalizeDate(date);
	d.setHours(23, 59, 59, 999);
	return d;
}
