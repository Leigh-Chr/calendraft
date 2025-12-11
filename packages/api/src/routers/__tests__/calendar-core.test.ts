/**
 * Tests for calendar core router
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "../../context";
import { calendarCoreRouter } from "../calendar/core";

// Mock Prisma
vi.mock("@calendraft/db", () => ({
	default: {
		calendar: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
			delete: vi.fn(),
			deleteMany: vi.fn(),
			count: vi.fn(),
		},
		calendarGroupMember: {
			findMany: vi.fn(),
		},
	},
}));

// Mock middleware
vi.mock("../../middleware", async () => {
	const actual = await vi.importActual("../../middleware");
	return {
		...actual,
		buildOwnershipFilter: vi.fn((ctx: Context) => ({
			OR: ctx.session?.user?.id
				? [{ userId: ctx.session.user.id }]
				: ctx.anonymousId
					? [{ userId: ctx.anonymousId }]
					: [],
		})),
		checkCalendarLimit: vi.fn(),
		getUserUsage: vi.fn(),
	};
});

describe("calendarCoreRouter", () => {
	const mockContext: Context = {
		session: null,
		anonymousId: "anon-test123",
		correlationId: "test-correlation-id",
		userId: "anon-test123",
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("list", () => {
		it("should return calendars for authenticated user", async () => {
			vi.mocked(prisma.calendar.findMany).mockResolvedValue([
				{
					id: "cal-1",
					name: "Test Calendar",
					color: "#FF0000",
					_count: { events: 5 },
					sourceUrl: null,
					lastSyncedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			const caller = calendarCoreRouter.createCaller({
				ctx: mockContext,
			});

			const result = await caller.list({});

			expect(result.calendars).toHaveLength(1);
			expect(result.calendars[0].name).toBe("Test Calendar");
		});

		it("should support pagination with cursor", async () => {
			vi.mocked(prisma.calendar.findMany).mockResolvedValue([
				{
					id: "cal-2",
					name: "Second Calendar",
					color: "#00FF00",
					_count: { events: 3 },
					sourceUrl: null,
					lastSyncedAt: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			const caller = calendarCoreRouter.createCaller({
				ctx: mockContext,
			});

			const _result = await caller.list({ cursor: "cal-1", limit: 10 });

			expect(vi.mocked(prisma.calendar.findMany)).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						id: { gt: "cal-1" },
					}),
					take: 11, // limit + 1
				}),
			);
		});
	});

	describe("getById", () => {
		it("should throw NOT_FOUND if calendar does not exist", async () => {
			vi.mocked(prisma.calendar.findUnique).mockResolvedValue(null);

			const caller = calendarCoreRouter.createCaller({
				ctx: mockContext,
			});

			await expect(caller.getById({ id: "non-existent" })).rejects.toThrow(
				TRPCError,
			);
			await expect(caller.getById({ id: "non-existent" })).rejects.toThrow(
				"Calendar not found",
			);
		});
	});
});
