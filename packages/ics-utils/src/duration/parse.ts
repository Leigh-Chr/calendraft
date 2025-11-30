/**
 * Parse ISO 8601 duration formats
 */

import type { ParsedDuration } from "../types";

/**
 * Parse days from duration string
 */
function parseDays(timePart: string): number {
	const match = timePart.match(/(\d+)D/);
	return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Parse time components from duration string
 */
function parseTimeComponents(timeStr: string): {
	hours: number;
	minutes: number;
	seconds: number;
} {
	const hoursMatch = timeStr.match(/(\d+)H/);
	const minutesMatch = timeStr.match(/(\d+)M/);
	const secondsMatch = timeStr.match(/(\d+)S/);

	return {
		hours: hoursMatch?.[1] ? Number.parseInt(hoursMatch[1], 10) : 0,
		minutes: minutesMatch?.[1] ? Number.parseInt(minutesMatch[1], 10) : 0,
		seconds: secondsMatch?.[1] ? Number.parseInt(secondsMatch[1], 10) : 0,
	};
}

/**
 * Determine the appropriate unit and value from parsed components
 */
function determineResult(
	days: number,
	hours: number,
	minutes: number,
	seconds: number,
): ParsedDuration | null {
	if (days > 0) return { value: days, unit: "days" };
	if (hours > 0) return { value: hours, unit: "hours" };
	if (minutes > 0) return { value: minutes, unit: "minutes" };
	if (seconds > 0) return { value: seconds, unit: "seconds" };
	return null;
}

/**
 * Parse an ISO 8601 duration string
 * @param duration - ISO 8601 duration string (e.g., PT5M, PT1H, P2D)
 * @returns Parsed duration object or null if invalid
 */
export function parseDuration(
	duration: string | undefined | null,
): ParsedDuration | null {
	if (!duration || !duration.trim()) {
		return null;
	}

	// Handle negative durations
	const isNegative = duration.startsWith("-");
	const clean = isNegative ? duration.slice(1) : duration;

	// Remove P prefix if present
	const withoutP = clean.replace(/^P/, "");

	// Parse days
	const days = parseDays(withoutP);

	// Parse time part (T...)
	const timeMatch = withoutP.match(/T(.+)/);
	if (!timeMatch && days === 0) {
		return null;
	}

	let hours = 0;
	let minutes = 0;
	let seconds = 0;

	if (timeMatch?.[1]) {
		const components = parseTimeComponents(timeMatch[1]);
		hours = components.hours;
		minutes = components.minutes;
		seconds = components.seconds;
	}

	return determineResult(days, hours, minutes, seconds);
}

/**
 * Check if a string is a valid ISO 8601 duration
 * @param duration - String to validate
 * @returns true if valid duration format
 */
export function isValidDuration(duration: string): boolean {
	return parseDuration(duration) !== null;
}

/**
 * Convert duration to total minutes
 * @param duration - ISO 8601 duration string
 * @returns Total minutes or null if invalid
 */
export function durationToMinutes(
	duration: string | undefined | null,
): number | null {
	const parsed = parseDuration(duration);
	if (!parsed) return null;

	switch (parsed.unit) {
		case "days":
			return parsed.value * 24 * 60;
		case "hours":
			return parsed.value * 60;
		case "minutes":
			return parsed.value;
		case "seconds":
			return Math.ceil(parsed.value / 60);
		default:
			return null;
	}
}
