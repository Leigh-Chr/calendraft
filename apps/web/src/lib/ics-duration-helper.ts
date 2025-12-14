/**
 * Helper functions for converting user-friendly duration inputs to ICS format
 * Converts simple values (minutes, hours, days) to ISO 8601 duration format (PT5M, PT1H, P2D)
 */

/**
 * Convert a simple duration input to ICS format
 * @param value - Numeric value
 * @param unit - Unit: "minutes", "hours", "days", or "seconds"
 * @returns ISO 8601 duration string (e.g., PT5M, PT1H, P2D, PT30S)
 */
export function formatDurationToICS(
	value: number | string,
	unit: "minutes" | "hours" | "days" | "seconds",
): string {
	const numValue =
		typeof value === "string" ? Number.parseInt(value, 10) : value;

	if (Number.isNaN(numValue) || numValue <= 0) {
		return "";
	}

	if (unit === "days") {
		return `P${numValue}D`;
	}
	if (unit === "hours") {
		return `PT${numValue}H`;
	}
	if (unit === "seconds") {
		return `PT${numValue}S`;
	}
	// minutes (default)
	return `PT${numValue}M`;
}

/**
 * Parse an ICS duration string back to a simple format
 * @param icsDuration - ISO 8601 duration string (e.g., PT5M, PT1H, P2D)
 * @returns Object with value and unit, or null if invalid
 */
export function parseDurationFromICS(
	icsDuration: string | undefined | null,
): { value: number; unit: "minutes" | "hours" | "days" | "seconds" } | null {
	if (!icsDuration || !icsDuration.trim()) {
		return null;
	}

	// Remove P prefix
	const clean = icsDuration.replace(/^P/, "");

	// Parse days
	const daysMatch = clean.match(/(\d+)D/);
	if (daysMatch?.[1]) {
		return { value: Number.parseInt(daysMatch[1], 10), unit: "days" };
	}

	// Parse time part (T...)
	const timeMatch = clean.match(/T(.+)/);
	if (!timeMatch || !timeMatch[1]) {
		return null;
	}

	const timePart = timeMatch[1];

	// Parse hours
	const hoursMatch = timePart.match(/(\d+)H/);
	if (hoursMatch?.[1]) {
		return { value: Number.parseInt(hoursMatch[1], 10), unit: "hours" };
	}

	// Parse minutes
	const minutesMatch = timePart.match(/(\d+)M/);
	if (minutesMatch?.[1]) {
		return { value: Number.parseInt(minutesMatch[1], 10), unit: "minutes" };
	}

	// Parse seconds
	const secondsMatch = timePart.match(/(\d+)S/);
	if (secondsMatch?.[1]) {
		return { value: Number.parseInt(secondsMatch[1], 10), unit: "seconds" };
	}

	return null;
}
