/**
 * Utility functions for parsing and formatting alarm durations in ISO 8601 format
 * Used for ICS (RFC 5545) alarm triggers
 */

export interface ParsedDuration {
	when: "before" | "at" | "after";
	value: number;
	unit: "minutes" | "hours" | "days";
}

/**
 * Parse days from duration string
 */
function parseDays(timePart: string): number {
	const daysMatch = timePart.match(/(\d+)D/);
	return daysMatch ? Number.parseInt(daysMatch[1], 10) : 0;
}

/**
 * Parse hours and minutes from time string
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
	const hoursMatch = timeStr.match(/(\d+)H/);
	const minutesMatch = timeStr.match(/(\d+)M/);
	return {
		hours: hoursMatch ? Number.parseInt(hoursMatch[1], 10) : 0,
		minutes: minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0,
	};
}

/**
 * Create duration result for a specific unit
 */
function createDurationForUnit(
	isNegative: boolean,
	value: number,
	unit: "days" | "hours" | "minutes",
): ParsedDuration {
	return { when: isNegative ? "before" : "after", value, unit };
}

/**
 * Create duration result based on parsed values
 */
function createDurationResult(
	isNegative: boolean,
	days: number,
	hours: number,
	minutes: number,
): ParsedDuration | null {
	if (days > 0) return createDurationForUnit(isNegative, days, "days");
	if (hours > 0) return createDurationForUnit(isNegative, hours, "hours");
	if (minutes > 0) return createDurationForUnit(isNegative, minutes, "minutes");
	return null;
}

/**
 * Check if duration is an absolute time
 * RFC 5545: Absolute datetime format is YYYYMMDDTHHmmss[Z]
 * The Z suffix indicates UTC, but it's optional in some contexts
 */
function isAbsoluteTime(duration: string): boolean {
	// Match YYYYMMDDTHHmmss with optional Z suffix
	return /^\d{8}T\d{6}(Z)?$/.test(duration);
}

/**
 * Parse duration with time component
 */
function parseDurationWithTime(
	timePart: string,
	isNegative: boolean,
	days: number,
): ParsedDuration | null {
	const timeMatch = timePart.match(/T(.+)/);
	if (!timeMatch) {
		return days > 0
			? { when: isNegative ? "before" : "after", value: days, unit: "days" }
			: null;
	}

	const { hours, minutes } = parseTime(timeMatch[1]);
	return createDurationResult(isNegative, days, hours, minutes);
}

/**
 * Parse ISO 8601 duration format (e.g., -PT15M, PT1H, P2D) into a structured format
 * @param duration - ISO 8601 duration string
 * @returns Parsed duration object or null if invalid
 */
export function parseDuration(duration: string): ParsedDuration | null {
	if (!duration) return null;

	// Check if it's an absolute time (starts with date)
	if (isAbsoluteTime(duration)) {
		return { when: "at", value: 0, unit: "minutes" };
	}

	// Parse ISO 8601 duration format: -PT15M, PT1H, P2D, etc.
	const isNegative = duration.startsWith("-");
	const cleanDuration = isNegative ? duration.slice(1) : duration;

	// Remove P prefix if present
	const timePart = cleanDuration.replace(/^P/, "");

	// Parse days
	const days = parseDays(timePart);

	// Parse time part (T...)
	return parseDurationWithTime(timePart, isNegative, days);
}

/**
 * Format a duration object into ISO 8601 duration string
 * @param when - When the alarm triggers: "before", "at", or "after"
 * @param value - Numeric value
 * @param unit - Unit of time: "minutes", "hours", or "days"
 * @returns ISO 8601 duration string or empty string for "at" triggers
 */
export function formatDuration(
	when: "before" | "at" | "after",
	value: number,
	unit: "minutes" | "hours" | "days",
): string {
	if (when === "at") {
		// Absolute time - keep original or return empty
		return "";
	}

	const prefix = when === "before" ? "-" : "";

	if (unit === "days") {
		return `${prefix}P${value}D`;
	}
	if (unit === "hours") {
		return `${prefix}PT${value}H`;
	}
	return `${prefix}PT${value}M`;
}
