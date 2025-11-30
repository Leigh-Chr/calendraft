/**
 * Format JavaScript Date to ICS date format
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
 * Convert JavaScript Date to ICS date-only format (YYYYMMDD)
 * @param date - JavaScript Date object
 * @returns ICS date-only string (YYYYMMDD)
 */
export function formatDateOnlyToICS(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}${month}${day}`;
}
