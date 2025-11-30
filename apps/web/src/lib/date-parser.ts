/**
 * Utility functions for parsing date arrays from JSON strings
 * Used for RDATE and EXDATE in ICS (RFC 5545) format
 */

/**
 * Parse a JSON string containing an array of date strings into Date objects
 * @param jsonString - JSON string containing an array of ISO date strings
 * @param fieldName - Name of the field for error messages (e.g., "RDATE", "EXDATE")
 * @returns Array of valid Date objects, or empty array if parsing fails
 */
export function parseDateArray(
	jsonString: string | undefined,
	fieldName: string,
): Date[] {
	if (!jsonString) {
		return [];
	}

	try {
		const parsed = JSON.parse(jsonString);
		if (!Array.isArray(parsed)) {
			throw new Error(`${fieldName} must be an array`);
		}
		const dates = parsed.map((d: string) => new Date(d));
		const validDates = dates.filter((d: Date) => !Number.isNaN(d.getTime()));

		if (validDates.length !== dates.length && import.meta.env.DEV) {
			console.warn(`Some dates in ${fieldName} were invalid`);
		}

		return validDates;
	} catch (error) {
		if (import.meta.env.DEV) {
			console.error(`Failed to parse ${fieldName}:`, error);
		}
		return [];
	}
}

/**
 * Convert an array of Date objects to a JSON string
 * @param dates - Array of Date objects
 * @returns JSON string containing ISO date strings, or undefined if array is empty
 */
export function stringifyDateArray(dates: Date[]): string | undefined {
	if (dates.length === 0) {
		return undefined;
	}
	return JSON.stringify(dates.map((d) => d.toISOString()));
}
