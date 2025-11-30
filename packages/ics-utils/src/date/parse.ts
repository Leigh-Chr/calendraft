/**
 * Parse ICS date formats to JavaScript Date
 */

/**
 * Parse ICS datetime with timezone (YYYYMMDDTHHmmssZ)
 */
function parseDateTimeWithTimezone(dateStr: string): Date {
	const year = Number.parseInt(dateStr.substring(0, 4), 10);
	const month = Number.parseInt(dateStr.substring(4, 6), 10) - 1;
	const day = Number.parseInt(dateStr.substring(6, 8), 10);
	const hours = Number.parseInt(dateStr.substring(9, 11), 10);
	const minutes = Number.parseInt(dateStr.substring(11, 13), 10);
	const seconds = Number.parseInt(dateStr.substring(13, 15), 10);
	return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

/**
 * Parse ICS date-only format (YYYYMMDD)
 */
function parseDateOnly(dateStr: string): Date {
	const year = Number.parseInt(dateStr.substring(0, 4), 10);
	const month = Number.parseInt(dateStr.substring(4, 6), 10) - 1;
	const day = Number.parseInt(dateStr.substring(6, 8), 10);
	return new Date(Date.UTC(year, month, day, 0, 0, 0));
}

/**
 * Convert ICS date format to JavaScript Date
 * Supports both YYYYMMDDTHHmmssZ and YYYYMMDD formats
 * @param icsDate - ICS date string (YYYYMMDDTHHmmssZ or YYYYMMDD)
 * @returns JavaScript Date object, or null if invalid
 */
export function parseDateFromICS(
	icsDate: string | undefined | null,
): Date | null {
	if (!icsDate || !icsDate.trim()) {
		return null;
	}

	const clean = icsDate.trim();

	// Format: YYYYMMDDTHHmmssZ (16 characters)
	if (clean.length === 16 && clean.includes("T") && clean.endsWith("Z")) {
		return parseDateTimeWithTimezone(clean);
	}

	// Format: YYYYMMDD (8 characters, date only)
	if (clean.length === 8 && /^\d{8}$/.test(clean)) {
		return parseDateOnly(clean);
	}

	return null;
}

/**
 * Check if a string is a valid ICS date format
 * @param dateStr - String to validate
 * @returns true if valid ICS date format
 */
export function isValidIcsDate(dateStr: string): boolean {
	return parseDateFromICS(dateStr) !== null;
}
