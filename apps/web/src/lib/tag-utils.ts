/**
 * Utility functions for managing comma-separated tags (categories, resources, etc.)
 */

/**
 * Parse a comma-separated string into an array of trimmed tags
 * Handles both string format and array of objects (normalized format)
 * @param tagString - Comma-separated string of tags, or array of objects with category/resource property
 * @returns Array of trimmed, non-empty tags
 */
export function parseTags(
	tagString:
		| string
		| undefined
		| Array<{ category?: string; resource?: string }>,
): string[] {
	if (!tagString) return [];

	// Handle array of objects (normalized format)
	if (Array.isArray(tagString)) {
		return tagString
			.map((item) => item.category || item.resource || "")
			.filter((tag) => tag.trim().length > 0);
	}

	// Handle string format
	if (typeof tagString !== "string") return [];

	return tagString
		.split(",")
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);
}

/**
 * Convert an array of tags into a comma-separated string
 * @param tags - Array of tag strings
 * @returns Comma-separated string, or undefined if array is empty
 */
export function stringifyTags(tags: string[]): string | undefined {
	const filtered = tags.filter((tag) => tag.trim().length > 0);
	return filtered.length > 0 ? filtered.join(", ") : undefined;
}

/**
 * Add a new tag to an existing comma-separated string
 * @param currentTags - Current comma-separated tags string
 * @param newTag - New tag to add
 * @returns Updated comma-separated string
 */
export function addTag(
	currentTags: string | undefined,
	newTag: string,
): string | undefined {
	const tags = parseTags(currentTags);
	const trimmedTag = newTag.trim();
	if (trimmedTag && !tags.includes(trimmedTag)) {
		tags.push(trimmedTag);
	}
	return stringifyTags(tags);
}

/**
 * Remove a tag from a comma-separated string
 * @param currentTags - Current comma-separated tags string
 * @param tagToRemove - Tag to remove
 * @returns Updated comma-separated string
 */
export function removeTag(
	currentTags: string | undefined,
	tagToRemove: string,
): string | undefined {
	const tags = parseTags(currentTags);
	const filtered = tags.filter((tag) => tag.trim() !== tagToRemove.trim());
	return stringifyTags(filtered);
}

/**
 * Get the last (incomplete) tag from a comma-separated string
 * Used for displaying the current input value
 * Handles both string format and array of objects (normalized format)
 * @param tagString - Comma-separated string of tags, or array of objects with category/resource property
 * @returns The last tag or empty string
 */
export function getLastTag(
	tagString:
		| string
		| undefined
		| Array<{ category?: string; resource?: string }>,
): string {
	if (!tagString) return "";

	// Handle array of objects (normalized format)
	if (Array.isArray(tagString)) {
		const tags = tagString
			.map((item) => item.category || item.resource || "")
			.filter((tag) => tag.trim().length > 0);
		return tags.length > 0 ? tags[tags.length - 1]?.trim() || "" : "";
	}

	// Handle string format
	if (typeof tagString !== "string") return "";

	const tags = tagString.split(",");
	return tags.length > 0 ? tags[tags.length - 1]?.trim() || "" : "";
}
