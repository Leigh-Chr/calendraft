/**
 * Centralized date formatting utilities
 * Eliminates duplicate date formatting logic across components
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Format a date to display format with time (e.g., "15 janvier 2024 à 14:30")
 */
export function formatDateTime(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "PPP 'à' HH:mm", { locale: fr });
}

/**
 * Format a date for display without time (e.g., "15 janvier 2024")
 */
export function formatDate(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "PPP", { locale: fr });
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
 * Format date for short display (e.g., "15/01/2024 14:30")
 */
export function formatDateTimeShort(date: Date | string): string {
	const dateObj = typeof date === "string" ? new Date(date) : date;
	return format(dateObj, "dd/MM/yyyy HH:mm");
}
