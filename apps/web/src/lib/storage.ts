/**
 * Local storage utilities for anonymous users
 */

import { nanoid } from "nanoid";

const ANONYMOUS_ID_KEY = "calendraft-anonymous-id";

/**
 * Anonymous ID format:
 * - Prefix: "anon-"
 * - Suffix: 32 characters from nanoid (128+ bits of entropy)
 * - Total: 37 characters
 * - Pattern: /^anon-[a-zA-Z0-9_-]{32}$/
 */
const ANON_ID_LENGTH = 32;

/**
 * Validate anonymous ID format
 */
export function isValidAnonymousId(id: string): boolean {
	const pattern = /^anon-[a-zA-Z0-9_-]{21,64}$/;
	return pattern.test(id);
}

/**
 * Get or create anonymous user ID
 * Uses nanoid with 32 characters for high entropy (192 bits)
 */
export function getAnonymousId(): string {
	if (typeof window === "undefined") {
		return "";
	}

	let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

	// Regenerate if invalid format (legacy or tampered)
	if (!anonymousId || !isValidAnonymousId(anonymousId)) {
		anonymousId = `anon-${nanoid(ANON_ID_LENGTH)}`;
		localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
	}

	return anonymousId;
}
