/**
 * Simple in-memory rate limiting middleware
 * Limits requests per IP address
 */

import type { Context } from "hono";
import { logSecurityEvent } from "../lib/logger";

type RateLimitStore = Map<string, { count: number; resetAt: number }>;

// Store for rate limiting (in-memory, lost on restart)
const rateLimitStore: RateLimitStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(
	() => {
		const now = Date.now();
		for (const [key, value] of rateLimitStore.entries()) {
			if (value.resetAt < now) {
				rateLimitStore.delete(key);
			}
		}
	},
	5 * 60 * 1000,
);

/**
 * Get client IP from request
 */
function getClientIP(request: Request): string {
	// Try to get IP from various headers (for proxies/load balancers)
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		const firstIP = forwarded.split(",")[0];
		if (firstIP) {
			return firstIP.trim();
		}
	}

	const realIP = request.headers.get("x-real-ip");
	if (realIP) {
		return realIP;
	}

	// Fallback (won't work in all environments, but better than nothing)
	return "unknown";
}

/**
 * Check rate limit for an IP
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if within limit, false if exceeded
 */
function checkRateLimit(
	ip: string,
	maxRequests: number,
	windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
	const now = Date.now();
	const key = ip;
	const record = rateLimitStore.get(key);

	if (!record || record.resetAt < now) {
		// New window or expired, reset
		const resetAt = now + windowMs;
		rateLimitStore.set(key, { count: 1, resetAt });
		return { allowed: true, remaining: maxRequests - 1, resetAt };
	}

	if (record.count >= maxRequests) {
		// Limit exceeded
		return {
			allowed: false,
			remaining: 0,
			resetAt: record.resetAt,
		};
	}

	// Increment count
	record.count++;
	return {
		allowed: true,
		remaining: maxRequests - record.count,
		resetAt: record.resetAt,
	};
}

/**
 * Rate limit middleware for Hono
 * @param maxRequests - Maximum requests allowed per window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param keyPrefix - Optional prefix for the rate limit key (to have separate limits)
 */
export function rateLimit(
	maxRequests: number,
	windowMs = 60000,
	keyPrefix = "",
) {
	return async (c: Context, next: () => Promise<void>) => {
		const ip = getClientIP(c.req.raw);

		// Skip rate limiting for unknown IPs (development)
		if (ip === "unknown") {
			return next();
		}

		const key = keyPrefix ? `${keyPrefix}:${ip}` : ip;
		const result = checkRateLimit(key, maxRequests, windowMs);

		if (!result.allowed) {
			const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

			// Log security event
			logSecurityEvent("rate_limit_exceeded", {
				ip,
				path: c.req.path,
				reason: keyPrefix
					? `${keyPrefix} rate limit exceeded`
					: "General rate limit exceeded",
			});

			return c.json(
				{
					error: "Too Many Requests",
					message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
					retryAfter,
				},
				429,
				{
					"Retry-After": String(retryAfter),
					"X-RateLimit-Limit": String(maxRequests),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(result.resetAt),
				},
			);
		}

		// Add rate limit headers
		c.header("X-RateLimit-Limit", String(maxRequests));
		c.header("X-RateLimit-Remaining", String(result.remaining));
		c.header("X-RateLimit-Reset", String(result.resetAt));

		return next();
	};
}

/**
 * Strict rate limit for authentication endpoints
 * 10 attempts per minute (to prevent brute force attacks)
 */
export function authRateLimit() {
	return rateLimit(10, 60000, "auth");
}

/**
 * Very strict rate limit for signup
 * 5 signups per minute per IP (to prevent abuse)
 */
export function signupRateLimit() {
	return rateLimit(5, 60000, "signup");
}
