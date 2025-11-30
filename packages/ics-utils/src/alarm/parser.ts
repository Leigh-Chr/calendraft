/**
 * Alarm trigger parsing and formatting
 * Handles RFC 5545 VALARM trigger formats
 */

import type { AlarmTrigger, AlarmWhen, DurationUnit } from "../types";

/**
 * Check if trigger is an absolute datetime
 * RFC 5545: Absolute datetime format is YYYYMMDDTHHmmss[Z]
 */
function isAbsoluteTime(trigger: string): boolean {
	return /^\d{8}T\d{6}(Z)?$/.test(trigger);
}

/**
 * Parse days from duration string
 */
function parseDays(timePart: string): number {
	const match = timePart.match(/(\d+)D/);
	return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

/**
 * Parse hours and minutes from time string
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
	const hoursMatch = timeStr.match(/(\d+)H/);
	const minutesMatch = timeStr.match(/(\d+)M/);
	return {
		hours: hoursMatch?.[1] ? Number.parseInt(hoursMatch[1], 10) : 0,
		minutes: minutesMatch?.[1] ? Number.parseInt(minutesMatch[1], 10) : 0,
	};
}

/**
 * Create alarm trigger result
 */
function createTrigger(
	when: AlarmWhen,
	value: number,
	unit: Exclude<DurationUnit, "seconds">,
): AlarmTrigger {
	return { when, value, unit };
}

/**
 * Build result from parsed components
 */
function buildResult(
	isNegative: boolean,
	days: number,
	hours: number,
	minutes: number,
): AlarmTrigger | null {
	const when: AlarmWhen = isNegative ? "before" : "after";

	if (days > 0) return createTrigger(when, days, "days");
	if (hours > 0) return createTrigger(when, hours, "hours");
	if (minutes > 0) return createTrigger(when, minutes, "minutes");

	return null;
}

/**
 * Parse an alarm trigger string into a structured format
 * @param trigger - ISO 8601 duration or absolute datetime
 * @returns Parsed alarm trigger or null if invalid
 */
export function parseAlarmTrigger(trigger: string): AlarmTrigger | null {
	if (!trigger) return null;

	// Handle absolute time triggers
	if (isAbsoluteTime(trigger)) {
		return createTrigger("at", 0, "minutes");
	}

	// Parse relative duration
	const isNegative = trigger.startsWith("-");
	const clean = isNegative ? trigger.slice(1) : trigger;
	const withoutP = clean.replace(/^P/, "");

	// Parse days
	const days = parseDays(withoutP);

	// Parse time part
	const timeMatch = withoutP.match(/T(.+)/);
	if (!timeMatch && days === 0) {
		return null;
	}

	let hours = 0;
	let minutes = 0;

	if (timeMatch?.[1]) {
		const parsed = parseTime(timeMatch[1]);
		hours = parsed.hours;
		minutes = parsed.minutes;
	}

	return buildResult(isNegative, days, hours, minutes);
}

/**
 * Format an alarm trigger to ISO 8601 duration string
 * @param when - When the alarm triggers: "before", "at", or "after"
 * @param value - Numeric value
 * @param unit - Unit of time: "minutes", "hours", or "days"
 * @returns ISO 8601 duration string or empty string for "at" triggers
 */
export function formatAlarmTrigger(
	when: AlarmWhen,
	value: number,
	unit: Exclude<DurationUnit, "seconds">,
): string {
	if (when === "at") {
		return "";
	}

	const prefix = when === "before" ? "-" : "";

	switch (unit) {
		case "days":
			return `${prefix}P${value}D`;
		case "hours":
			return `${prefix}PT${value}H`;
		case "minutes":
		default:
			return `${prefix}PT${value}M`;
	}
}
