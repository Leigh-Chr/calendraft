/**
 * Format durations to ISO 8601 format
 */

import type { DurationUnit } from "../types";

/**
 * Format a duration to ISO 8601 format
 * @param value - Numeric value
 * @param unit - Unit: "minutes", "hours", "days", or "seconds"
 * @returns ISO 8601 duration string (e.g., PT5M, PT1H, P2D, PT30S)
 */
export function formatDuration(
	value: number | string,
	unit: DurationUnit,
): string {
	const numValue =
		typeof value === "string" ? Number.parseInt(value, 10) : value;

	if (Number.isNaN(numValue) || numValue <= 0) {
		return "";
	}

	switch (unit) {
		case "days":
			return `P${numValue}D`;
		case "hours":
			return `PT${numValue}H`;
		case "seconds":
			return `PT${numValue}S`;
		case "minutes":
		default:
			return `PT${numValue}M`;
	}
}

/**
 * Format a negative duration (for alarm triggers before event)
 * @param value - Numeric value
 * @param unit - Unit: "minutes", "hours", or "days"
 * @returns Negative ISO 8601 duration string (e.g., -PT15M)
 */
export function formatNegativeDuration(
	value: number,
	unit: Exclude<DurationUnit, "seconds">,
): string {
	const positive = formatDuration(value, unit);
	return positive ? `-${positive}` : "";
}
