/**
 * Rate limiting middleware for tRPC procedures
 * Simple in-memory rate limiting (can be enhanced with Redis later)
 */

import { TRPCError } from "@trpc/server";
import { t } from "../index";
import { logger } from "../lib/logger";

// Simple in-memory rate limit store
type RateLimitEntry = {
	count: number;
	resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 */
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetAt < now) {
			rateLimitStore.delete(key);
		}
	}
}, 60000); // Clean up every minute

/**
 * Check rate limit
 */
function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	if (!entry || entry.resetAt < now) {
		// Create new entry
		const resetAt = now + windowMs;
		rateLimitStore.set(key, { count: 1, resetAt });
		return {
			allowed: true,
			remaining: maxRequests - 1,
			resetAt,
		};
	}

	// Entry exists and is valid
	if (entry.count >= maxRequests) {
		return {
			allowed: false,
			remaining: 0,
			resetAt: entry.resetAt,
		};
	}

	// Increment count
	entry.count++;
	return {
		allowed: true,
		remaining: maxRequests - entry.count,
		resetAt: entry.resetAt,
	};
}

/**
 * Create a rate limiting middleware for tRPC
 */
export function createRateLimitMiddleware(
	maxRequests: number,
	windowMs: number,
	keyPrefix: string,
) {
	return t.middleware(async ({ ctx, next }) => {
		// Use userId if available, otherwise use anonymousId, otherwise use a default key
		const userId = ctx.session?.user?.id || ctx.anonymousId || "unknown";
		const key = `${keyPrefix}:${userId}`;

		try {
			const result = checkRateLimit(key, maxRequests, windowMs);

			if (!result.allowed) {
				const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000);
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: `Rate limit exceeded. Please try again in ${resetIn} seconds.`,
					cause: {
						resetAt: result.resetAt,
						remaining: result.remaining,
					},
				});
			}

			return next({ ctx });
		} catch (error) {
			// If it's already a TRPCError, rethrow it
			if (error instanceof TRPCError) {
				throw error;
			}
			// For other errors, log and allow the request (fail open)
			// This ensures the service remains available if rate limiting fails
			logger.error("Error in rate limiting middleware", error);
			return next({ ctx });
		}
	});
}

/**
 * Rate limit for account deletion (1 per hour)
 */
export const deleteAccountRateLimit = createRateLimitMiddleware(
	1,
	3600000, // 1 hour
	"delete-account",
);

/**
 * Rate limit for data export (5 per day)
 */
export const exportDataRateLimit = createRateLimitMiddleware(
	5,
	86400000, // 24 hours
	"export-data",
);

/**
 * Rate limit for password change (10 per hour)
 */
export const changePasswordRateLimit = createRateLimitMiddleware(
	10,
	3600000, // 1 hour
	"change-password",
);

/**
 * Rate limit for profile update (20 per hour)
 */
export const updateProfileRateLimit = createRateLimitMiddleware(
	20,
	3600000, // 1 hour
	"update-profile",
);
