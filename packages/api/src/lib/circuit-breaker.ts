/**
 * Circuit Breaker pattern for external service calls
 * Prevents cascading failures by stopping requests to failing services
 * Best practice: Use for external API calls (import from URL, etc.)
 */

import { TRPCError } from "@trpc/server";
import { logger } from "./logger";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
	/** Number of failures before opening circuit */
	failureThreshold?: number;
	/** Time in ms to wait before attempting half-open */
	resetTimeout?: number;
	/** Name for logging */
	name?: string;
}

/**
 * Circuit Breaker implementation
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit is open, requests are rejected immediately
 * - HALF_OPEN: Testing if service recovered, allows one request
 */
export class CircuitBreaker {
	private failures = 0;
	private state: CircuitState = "CLOSED";
	private lastFailureTime = 0;
	private readonly failureThreshold: number;
	private readonly resetTimeout: number;
	private readonly name: string;

	constructor(options: CircuitBreakerOptions = {}) {
		this.failureThreshold = options.failureThreshold ?? 5;
		this.resetTimeout = options.resetTimeout ?? 60000; // 1 minute
		this.name = options.name ?? "CircuitBreaker";
	}

	/**
	 * Execute a function with circuit breaker protection
	 */
	async execute<T>(fn: () => Promise<T>): Promise<T> {
		// Check if circuit should transition from OPEN to HALF_OPEN
		if (this.state === "OPEN") {
			const timeSinceLastFailure = Date.now() - this.lastFailureTime;
			if (timeSinceLastFailure > this.resetTimeout) {
				this.state = "HALF_OPEN";
				logger.info(`${this.name}: Circuit transitioning to HALF_OPEN`);
			} else {
				// Circuit is still open, reject immediately
				// Use INTERNAL_SERVER_ERROR as tRPC doesn't have SERVICE_UNAVAILABLE code
				// The message clearly indicates it's a temporary service issue
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						"External service is temporarily unavailable. Please try again later.",
				});
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	/**
	 * Handle successful request
	 */
	private onSuccess() {
		this.failures = 0;
		if (this.state === "HALF_OPEN") {
			this.state = "CLOSED";
			logger.info(`${this.name}: Circuit closed after successful recovery`);
		}
	}

	/**
	 * Handle failed request
	 */
	private onFailure() {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.state === "HALF_OPEN") {
			// Failed in half-open state, go back to open
			this.state = "OPEN";
			logger.warn(`${this.name}: Circuit reopened after failure in HALF_OPEN`);
		} else if (this.failures >= this.failureThreshold) {
			// Too many failures, open circuit
			this.state = "OPEN";
			logger.warn(
				`${this.name}: Circuit opened after ${this.failures} failures`,
			);
		}
	}

	/**
	 * Get current circuit state (for monitoring)
	 */
	getState(): CircuitState {
		return this.state;
	}

	/**
	 * Get failure count (for monitoring)
	 */
	getFailureCount(): number {
		return this.failures;
	}

	/**
	 * Manually reset circuit (for testing/admin)
	 */
	reset() {
		this.state = "CLOSED";
		this.failures = 0;
		this.lastFailureTime = 0;
		logger.info(`${this.name}: Circuit manually reset`);
	}
}

/**
 * Global circuit breaker instance for external URL imports
 * Shared across all import requests to prevent overwhelming external services
 */
export const urlImportCircuitBreaker = new CircuitBreaker({
	failureThreshold: 5,
	resetTimeout: 60000, // 1 minute
	name: "URLImportCircuitBreaker",
});
