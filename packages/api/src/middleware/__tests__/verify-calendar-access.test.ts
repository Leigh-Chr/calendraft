/**
 * Tests for verifyCalendarAccess utility function
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../../context";
import { verifyCalendarAccess } from "../../middleware";

// Mock Prisma
vi.mock("@calendraft/db", () => ({
	default: {
		calendar: {
			findUnique: vi.fn(),
		},
	},
}));

describe("verifyCalendarAccess", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should throw NOT_FOUND if calendar does not exist", async () => {
		vi.mocked(prisma.calendar.findUnique).mockResolvedValue(null);

		const ctx: Context = {
			session: null,
			anonymousId: "anon-test123",
			correlationId: "test-correlation-id",
			userId: "anon-test123",
		};

		await expect(verifyCalendarAccess("non-existent-id", ctx)).rejects.toThrow(
			TRPCError,
		);
		await expect(verifyCalendarAccess("non-existent-id", ctx)).rejects.toThrow(
			"Calendar not found",
		);
	});

	it("should throw FORBIDDEN if user does not have access", async () => {
		vi.mocked(prisma.calendar.findUnique).mockResolvedValue({
			id: "calendar-id",
			userId: "other-user-id",
		});

		const ctx: Context = {
			session: null,
			anonymousId: "anon-test123",
			correlationId: "test-correlation-id",
			userId: "anon-test123",
		};

		await expect(verifyCalendarAccess("calendar-id", ctx)).rejects.toThrow(
			TRPCError,
		);
		await expect(verifyCalendarAccess("calendar-id", ctx)).rejects.toThrow(
			"Access denied",
		);
	});

	it("should return calendar if user has access", async () => {
		const calendar = {
			id: "calendar-id",
			userId: "anon-test123",
		};
		vi.mocked(prisma.calendar.findUnique).mockResolvedValue(calendar);

		const ctx: Context = {
			session: null,
			anonymousId: "anon-test123",
			correlationId: "test-correlation-id",
			userId: "anon-test123",
		};

		const result = await verifyCalendarAccess("calendar-id", ctx);
		expect(result).toEqual(calendar);
	});
});
