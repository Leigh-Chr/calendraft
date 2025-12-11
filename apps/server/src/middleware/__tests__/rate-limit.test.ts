/**
 * Tests for rate limiting middleware
 */

import type { Context } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "../rate-limit";

// Mock Redis
vi.mock("ioredis", () => {
	return {
		default: vi.fn().mockImplementation(() => ({
			incr: vi.fn(),
			pexpire: vi.fn(),
			pttl: vi.fn(),
			on: vi.fn(),
			connect: vi.fn(),
			quit: vi.fn(),
			status: "ready",
		})),
	};
});

// Mock logger
vi.mock("../../lib/logger", () => ({
	logger: {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
	},
	logSecurityEvent: vi.fn(),
	getLogContext: vi.fn(),
}));

describe("rateLimit", () => {
	let mockContext: Partial<Context>;
	let mockNext: () => Promise<void>;

	beforeEach(() => {
		mockContext = {
			req: {
				raw: new Request("http://localhost:3000/test", {
					headers: {
						"x-forwarded-for": "192.168.1.1",
					},
				}),
				path: "/test",
				method: "GET",
				header: vi.fn((name: string) => {
					if (name === "x-correlation-id") return "test-correlation-id";
					return null;
				}),
			},
			header: vi.fn(),
			json: vi.fn((body, status, headers) => ({
				body,
				status,
				headers,
			})),
		};
		mockNext = vi.fn().mockResolvedValue(undefined);
	});

	it("should allow request within rate limit", async () => {
		const middleware = rateLimit(10, 60000);
		await middleware(mockContext as Context, mockNext);

		expect(mockNext).toHaveBeenCalled();
	});

	it("should skip rate limiting for unknown IPs", async () => {
		mockContext.req = {
			...(mockContext.req ?? {}),
			raw: new Request("http://localhost:3000/test"),
		} as Context["req"];

		const middleware = rateLimit(10, 60000);
		await middleware(mockContext as Context, mockNext);

		expect(mockNext).toHaveBeenCalled();
	});
});
