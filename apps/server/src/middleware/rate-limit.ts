/**
 * Redis-based rate limiting middleware
 * Supports distributed rate limiting across multiple instances
 */

import type { Context } from "hono";
import Redis from "ioredis";
import { getLogContext, logger, logSecurityEvent } from "../lib/logger";
import { env as rateLimitEnv } from "./env";

// Redis client singleton
let redisClient: Redis | null = null;

/**
 * Initialize Redis client
 * Falls back to in-memory if Redis is not available
 */
function getRedisClient(): Redis | null {
	if (redisClient) {
		return redisClient;
	}

	const redisUrl = rateLimitEnv.REDIS_URL;
	if (!redisUrl) {
		return null;
	}

	try {
		redisClient = new Redis(redisUrl, {
			maxRetriesPerRequest: 3,
			retryStrategy: (times: number) => {
				const delay = Math.min(times * 50, 2000);
				return delay;
			},
			enableReadyCheck: true,
			lazyConnect: true,
		});

		redisClient.on("error", (err: Error) => {
			logger.error("[Redis] Connection error", err);
		});

		redisClient.on("connect", () => {
			logger.info("[Redis] Connected successfully");
		});

		return redisClient;
	} catch (error) {
		logger.error("[Redis] Failed to initialize", error);
		return null;
	}
}

// Fallback in-memory store (only used if Redis is unavailable)
type RateLimitStore = Map<string, { count: number; resetAt: number }>;
const fallbackStore: RateLimitStore = new Map();

// Cleanup old entries every 5 minutes (fallback only)
setInterval(
	() => {
		if (redisClient) return; // Only cleanup if using fallback

		const now = Date.now();
		for (const [key, value] of fallbackStore.entries()) {
			if (value.resetAt < now) {
				fallbackStore.delete(key);
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
 * Check rate limit using Redis
 */
async function checkRateLimitRedis(
	key: string,
	maxRequests: number,
	windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const client = getRedisClient();
	if (!client) {
		throw new Error("Redis client not available");
	}

	const now = Date.now();
	const windowKey = `ratelimit:${key}`;

	try {
		// Use Redis INCR with expiration
		const count = await client.incr(windowKey);

		// Set expiration on first request
		if (count === 1) {
			await client.pexpire(windowKey, windowMs);
		}

		// Get TTL to calculate actual reset time
		const ttl = await client.pttl(windowKey);
		const actualResetAt = now + (ttl > 0 ? ttl : windowMs);

		if (count > maxRequests) {
			return {
				allowed: false,
				remaining: 0,
				resetAt: actualResetAt,
			};
		}

		return {
			allowed: true,
			remaining: Math.max(0, maxRequests - count),
			resetAt: actualResetAt,
		};
	} catch (error) {
		logger.error("[Redis] Rate limit check failed", error);
		// Fall through to fallback
		throw error;
	}
}

/**
 * Check rate limit using fallback in-memory store
 */
function checkRateLimitFallback(
	key: string,
	maxRequests: number,
	windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
	const now = Date.now();
	const record = fallbackStore.get(key);

	if (!record || record.resetAt < now) {
		// New window or expired, reset
		const resetAt = now + windowMs;
		fallbackStore.set(key, { count: 1, resetAt });
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
 * Check rate limit (Redis with fallback to in-memory)
 */
async function checkRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
	const client = getRedisClient();

	if (client) {
		try {
			// Ensure connection is ready
			if (client.status !== "ready") {
				await client.connect();
			}
			return await checkRateLimitRedis(key, maxRequests, windowMs);
		} catch (error) {
			// Fallback to in-memory if Redis fails
			logger.warn("[Rate Limit] Redis unavailable, using fallback", error);
			return checkRateLimitFallback(key, maxRequests, windowMs);
		}
	}

	// No Redis configured, use fallback
	return checkRateLimitFallback(key, maxRequests, windowMs);
}

/**
 * Build rate limit error response
 */
function buildRateLimitErrorResponse(
	c: Context,
	result: { resetAt: number },
	maxRequests: number,
	keyPrefix: string,
	ip: string,
) {
	const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
	const correlationId = c.req.header("x-correlation-id");

	// Log security event with correlation ID
	logSecurityEvent("rate_limit_exceeded", {
		ip,
		path: c.req.path,
		...(correlationId ? { correlationId } : {}),
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

/**
 * Handle rate limit errors
 */
function handleRateLimitError(c: Context, error: unknown): void {
	const correlationId = c.req.header("x-correlation-id");
	const context = correlationId ? getLogContext(correlationId) : undefined;
	logger.error("[Rate Limit] Error", error, context);
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

		try {
			const result = await checkRateLimit(key, maxRequests, windowMs);

			if (!result.allowed) {
				return buildRateLimitErrorResponse(
					c,
					result,
					maxRequests,
					keyPrefix,
					ip,
				);
			}

			// Add rate limit headers
			c.header("X-RateLimit-Limit", String(maxRequests));
			c.header("X-RateLimit-Remaining", String(result.remaining));
			c.header("X-RateLimit-Reset", String(result.resetAt));

			return next();
		} catch (error) {
			// If rate limiting fails, allow the request but log the error
			handleRateLimitError(c, error);
			return next();
		}
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

/**
 * Rate limit for email verification resend
 * 1 request every 30 seconds per IP
 * This prevents spam while allowing reasonable retry attempts
 * Note: This is a sliding window, so users can send 1 email every 30 seconds
 */
export function emailVerificationResendRateLimit() {
	// 1 request per 30 seconds (30000ms)
	return rateLimit(1, 30000, "email-verification-resend");
}

/**
 * Rate limit for account deletion
 * 1 request per hour (very strict - irreversible action)
 */
export function deleteAccountRateLimit() {
	// 1 request per hour (3600000ms)
	return rateLimit(1, 3600000, "delete-account");
}

/**
 * Rate limit for data export (RGPD)
 * 5 requests per day per user
 */
export function exportDataRateLimit() {
	// 5 requests per day (86400000ms = 24 hours)
	return rateLimit(5, 86400000, "export-data");
}

/**
 * Rate limit for password change
 * 10 requests per hour (security-sensitive operation)
 */
export function changePasswordRateLimit() {
	// 10 requests per hour (3600000ms)
	return rateLimit(10, 3600000, "change-password");
}

/**
 * Rate limit for profile update
 * 20 requests per hour (less critical, but still should be limited)
 */
export function updateProfileRateLimit() {
	// 20 requests per hour (3600000ms)
	return rateLimit(20, 3600000, "update-profile");
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedisConnection(): Promise<void> {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
	}
}
