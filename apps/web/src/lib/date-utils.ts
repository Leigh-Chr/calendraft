/**
 * Centralized date formatting utilities
 * Eliminates duplicate date formatting logic across components
 */

import {
	differenceInMinutes,
	format,
	isFuture,
	isPast,
	isSameDay,
	isThisWeek,
	isThisYear,
	isToday,
	isTomorrow,
	isYesterday,
} from "date-fns";
import { enUS } from "date-fns/locale";

/**
 * Format a date to display format with time (e.g., "January 15, 2024 at 14:30")
 */
export function formatDateTime(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "PPP 'at' HH:mm", { locale: enUS });
}

/**
 * Format a date for display without time (e.g., "January 15, 2024")
 */
export function formatDate(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "PPP", { locale: enUS });
}

/**
 * Format a date for forms (e.g., "2024-01-15T14:30")
 */
export function formatDateTimeLocal(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Format date for ICS format (YYYYMMDDTHHmmssZ)
 */
export function formatIcsDate(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const seconds = String(date.getUTCSeconds()).padStart(2, "0");
	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Parse ICS date format (YYYYMMDDTHHmmssZ)
 */
export function parseIcsDate(dateStr: string): Date {
	const year = Number.parseInt(dateStr.substring(0, 4), 10);
	const month = Number.parseInt(dateStr.substring(4, 6), 10) - 1;
	const day = Number.parseInt(dateStr.substring(6, 8), 10);
	const hours = Number.parseInt(dateStr.substring(9, 11), 10);
	const minutes = Number.parseInt(dateStr.substring(11, 13), 10);
	const seconds = Number.parseInt(dateStr.substring(13, 15), 10);
	return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/**
 * Calculate duration between two dates and format it
 */
export function formatDuration(
	start: Date | string,
	end: Date | string,
): string {
	const startDate = typeof start === "string" ? new Date(start) : start;
	const endDate = typeof end === "string" ? new Date(end) : end;
	const diff = endDate.getTime() - startDate.getTime();
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	if (hours > 0) {
		return `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`;
	}
	return `${minutes}min`;
}

/**
 * Normalize a date value to Date object
 */
export function normalizeDate(date: Date | string): Date {
	return date instanceof Date ? date : new Date(date);
}

/**
 * Format date for short display (e.g., "2024-01-15 14:30")
 * Uses ISO 8601 date format for universal compatibility
 */
export function formatDateTimeShort(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "yyyy-MM-dd HH:mm");
}

/**
 * Format date with contextual label (Today, Tomorrow, etc.)
 * Returns a user-friendly date string that adapts to context
 */
export function formatDateContextual(date: Date | string): string {
	const dateObj = normalizeDate(date);

	if (isToday(dateObj)) {
		return "Today";
	}
	if (isTomorrow(dateObj)) {
		return "Tomorrow";
	}
	if (isYesterday(dateObj)) {
		return "Yesterday";
	}
	if (isThisWeek(dateObj, { locale: enUS })) {
		return format(dateObj, "EEEE", { locale: enUS }); // "Monday", "Tuesday", etc.
	}
	if (isThisYear(dateObj)) {
		return format(dateObj, "MMM d", { locale: enUS }); // "Jan 15"
	}
	return format(dateObj, "MMM d, yyyy", { locale: enUS }); // "Jan 15, 2024"
}

/**
 * Format time only (e.g., "14:30")
 */
export function formatTime(date: Date | string): string {
	const dateObj = normalizeDate(date);
	return format(dateObj, "HH:mm");
}

/**
 * Format a time range for same-day events
 * Returns: "14:00 - 16:00" or "14:00 - 16:00 (2h)"
 */
export function formatTimeRange(
	start: Date | string,
	end: Date | string,
	showDuration = false,
): string {
	const startDate = normalizeDate(start);
	const endDate = normalizeDate(end);
	const timeRange = `${formatTime(startDate)} - ${formatTime(endDate)}`;

	if (showDuration) {
		const duration = formatDuration(startDate, endDate);
		return `${timeRange} (${duration})`;
	}
	return timeRange;
}

/**
 * Format event date/time contextually
 * Adapts output based on whether event is same day, near future, or past
 */
export function formatEventDateTime(
	startDate: Date | string,
	endDate: Date | string,
): { date: string; time: string; isMultiDay: boolean; isPastEvent: boolean } {
	const start = normalizeDate(startDate);
	const end = normalizeDate(endDate);
	const multiDay = !isSameDay(start, end);
	const pastEvent = isPast(end);

	if (multiDay) {
		return {
			date: `${formatDateContextual(start)} → ${formatDateContextual(end)}`,
			time: `${formatTime(start)} - ${formatTime(end)}`,
			isMultiDay: true,
			isPastEvent: pastEvent,
		};
	}

	return {
		date: formatDateContextual(start),
		time: formatTimeRange(start, end),
		isMultiDay: false,
		isPastEvent: pastEvent,
	};
}

/**
 * Get relative time indicator for events
 * Returns: "En cours", "Dans 15 min", "Il y a 2h", etc.
 */
export function getEventTimeStatus(
	startDate: Date | string,
	endDate: Date | string,
): { status: "past" | "ongoing" | "upcoming" | "soon"; label: string } | null {
	const now = new Date();
	const start = normalizeDate(startDate);
	const end = normalizeDate(endDate);

	// Event is ongoing
	if (start <= now && end >= now) {
		return { status: "ongoing", label: "En cours" };
	}

	// Event is in the past
	if (isPast(end)) {
		return { status: "past", label: "Finished" };
	}

	// Event is upcoming
	if (isFuture(start)) {
		const minutesUntilStart = differenceInMinutes(start, now);

		if (minutesUntilStart <= 15) {
			return { status: "soon", label: `In ${minutesUntilStart} min` };
		}
		if (minutesUntilStart <= 60) {
			return { status: "upcoming", label: `In ${minutesUntilStart} min` };
		}
	}

	return null;
}

/**
 * Group events by date for list display
 * Returns events organized by contextual date labels
 */
export function groupEventsByDate<T extends { startDate: Date | string }>(
	events: T[],
): Map<string, { label: string; date: Date; events: T[] }> {
	const groups = new Map<string, { label: string; date: Date; events: T[] }>();

	for (const event of events) {
		const date = normalizeDate(event.startDate);
		const dateKey = format(date, "yyyy-MM-dd");
		const label = formatDateContextual(date);

		if (!groups.has(dateKey)) {
			groups.set(dateKey, { label, date, events: [] });
		}
		groups.get(dateKey)?.events.push(event);
	}

	return groups;
}
