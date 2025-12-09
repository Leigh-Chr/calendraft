/**
 * Utility functions for seed script
 */

/**
 * Generate a valid anonymous ID (format: anon-[32 characters])
 */
export function generateAnonymousId(suffix: string): string {
	// Format: anon- + 32 alphanumeric characters
	const padding = "0123456789abcdefghijklmnopqrstuvwxyz";
	const randomPart = suffix.padEnd(32, padding).substring(0, 32);
	return `anon-${randomPart}`;
}

/**
 * Generate a valid share token (format: base64url, ~43 characters)
 * Uses a simple hash-like approach to ensure uniqueness
 */
export function generateShareToken(suffix: string): string {
	// Format base64url: alphanumeric + - and _
	const base64urlChars =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
	// Create a hash-like string from the suffix to ensure uniqueness
	let hash = 0;
	for (let i = 0; i < suffix.length; i++) {
		const char = suffix.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	// Convert to positive and use as seed for padding
	const seed = Math.abs(hash).toString(36);
	const combined = suffix + seed;
	const randomPart = combined.padEnd(43, base64urlChars).substring(0, 43);
	return randomPart;
}

/**
 * Helper function to create dates relative to a base date
 */
export function createDate(
	base: Date,
	daysOffset: number,
	hours: number,
	minutes: number,
): Date {
	const date = new Date(base);
	date.setDate(date.getDate() + daysOffset);
	date.setHours(hours, minutes, 0, 0);
	return date;
}
