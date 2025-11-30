/**
 * Local storage utilities for anonymous users
 */

import { nanoid } from "nanoid";

const ANONYMOUS_ID_KEY = "calendraft-anonymous-id";

/**
 * Get or create anonymous user ID
 * Uses nanoid for collision-safe, URL-friendly unique IDs
 */
export function getAnonymousId(): string {
	if (typeof window === "undefined") {
		return "";
	}

	let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
	if (!anonymousId) {
		anonymousId = `anon-${nanoid()}`;
		localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
	}
	return anonymousId;
}
