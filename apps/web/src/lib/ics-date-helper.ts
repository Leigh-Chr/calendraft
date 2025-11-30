/**
 * Helper functions for converting between ICS date format and JavaScript Date
 * ICS format: YYYYMMDDTHHmmssZ or YYYYMMDD
 */

/**
 * Convert JavaScript Date to ICS date format (YYYYMMDDTHHmmssZ)
 * @param date - JavaScript Date object
 * @returns ICS date string (YYYYMMDDTHHmmssZ)
 */
export function formatDateToICS(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const seconds = String(date.getUTCSeconds()).padStart(2, "0");
	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
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

	// Format: YYYYMMDDTHHmmssZ
	if (clean.length === 16 && clean.includes("T") && clean.endsWith("Z")) {
		const year = Number.parseInt(clean.substring(0, 4), 10);
		const month = Number.parseInt(clean.substring(4, 6), 10) - 1; // Month is 0-indexed
		const day = Number.parseInt(clean.substring(6, 8), 10);
		const hours = Number.parseInt(clean.substring(9, 11), 10);
		const minutes = Number.parseInt(clean.substring(11, 13), 10);
		const seconds = Number.parseInt(clean.substring(13, 15), 10);

		return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
	}

	// Format: YYYYMMDD (date only, no time)
	if (clean.length === 8) {
		const year = Number.parseInt(clean.substring(0, 4), 10);
		const month = Number.parseInt(clean.substring(4, 6), 10) - 1; // Month is 0-indexed
		const day = Number.parseInt(clean.substring(6, 8), 10);

		return new Date(Date.UTC(year, month, day, 0, 0, 0));
	}

	return null;
}
