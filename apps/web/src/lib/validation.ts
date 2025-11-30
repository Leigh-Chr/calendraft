/**
 * Validation utility functions for form inputs
 * These functions now use Zod schemas for consistency
 */

import { emailSchema, urlSchema } from "@calendraft/schemas";

/**
 * Validate email format using Zod schema
 * @param email - Email string to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateEmail(email: string): string | undefined {
	if (!email || !email.trim()) return undefined;
	const result = emailSchema.safeParse(email);
	if (!result.success) {
		return result.error.issues[0]?.message || "Format d'email invalide";
	}
	return undefined;
}

/**
 * Validate URL format and ensure safe protocols using Zod schema
 * @param url - URL string to validate
 * @returns Error message if invalid, undefined if valid
 */
export function validateURL(url: string): string | undefined {
	if (!url || !url.trim()) return undefined;
	const result = urlSchema.safeParse(url);
	if (!result.success) {
		return result.error.issues[0]?.message || "Format d'URL invalide";
	}
	return undefined;
}
