/**
 * Tests for verifyCalendarAccess utility function
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma (must be before importing from @calendraft/db or middleware)
// This prevents the env validation from running
vi.mock("@calendraft/db", () => ({
	default: {
		calendar: {
			findUnique: vi.fn(),
		},
		calendarGroupMember: {
			findFirst: vi.fn(),
		},
	},
	Prisma: {},
}));

// Import after mocks are set up
import prisma from "@calendraft/db";
import type { Context } from "../../context";
import { verifyCalendarAccess } from "../../middleware";

describe("verifyCalendarAccess", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should throw NOT_FOUND if calendar does not exist", async () => {
		(prisma.calendar.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);

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
		(prisma.calendar.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
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
		(prisma.calendar.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
			calendar,
		);
		(
			prisma.calendarGroupMember.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const ctx: Context = {
			session: null,
			anonymousId: "anon-test123",
			correlationId: "test-correlation-id",
			userId: "anon-test123",
		};

		const result = await verifyCalendarAccess("calendar-id", ctx);
		expect(result).toEqual(calendar);
	});

	it("should return calendar if user has access via shared group", async () => {
		const calendar = {
			id: "calendar-id",
			userId: "other-user-id",
		};
		(prisma.calendar.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
			calendar,
		);
		(
			prisma.calendarGroupMember.findFirst as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			groupId: "group-id",
		});

		const ctx: Context = {
			session: { user: { id: "user-123" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-123",
		};

		const result = await verifyCalendarAccess("calendar-id", ctx);
		expect(result).toEqual(calendar);
	});
});
