/**
 * Tests for calendar core router
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma (must be before importing from @calendraft/db)
// This prevents the env validation from running
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
	Prisma: {},
}));

import prisma from "@calendraft/db";
import type { Context } from "../../context";
import { calendarCoreRouter } from "../calendar/core";

// Mock middleware
vi.mock("../../middleware", () => ({
	buildOwnershipFilter: vi.fn((ctx: Context) => ({
		OR: ctx.session?.user?.id
			? [{ userId: ctx.session.user.id }]
			: ctx.anonymousId
				? [{ userId: ctx.anonymousId }]
				: [],
	})),
	checkCalendarLimit: vi.fn(),
	getUserUsage: vi.fn(),
	isAnonymousUser: vi.fn(
		(ctx: Context) => !ctx.session?.user?.id && !!ctx.anonymousId,
	),
	isAuthenticatedUser: vi.fn((ctx: Context) => !!ctx.session?.user?.id),
	verifyCalendarAccess: vi.fn(),
}));

describe("calendarCoreRouter", () => {
	const mockContext: Context = {
		session: null,
		anonymousId: "anon-test123",
		correlationId: "test-correlation-id",
		userId: "anon-test123", // Explicitly set userId for anonymous user
	} as Context;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("list", () => {
		it("should return calendars for authenticated user", async () => {
			(prisma.calendar.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
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

			const caller = calendarCoreRouter.createCaller(mockContext);

			const result = await caller.list({});

			expect(result.calendars).toHaveLength(1);
			expect(result.calendars[0].name).toBe("Test Calendar");
		});

		it("should support pagination with cursor", async () => {
			(prisma.calendar.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
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

			const caller = calendarCoreRouter.createCaller(mockContext);

			const _result = await caller.list({ cursor: "cal-1", limit: 10 });

			expect(prisma.calendar.findMany).toHaveBeenCalledWith(
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
			(
				prisma.calendar.findUnique as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			const caller = calendarCoreRouter.createCaller(mockContext);

			await expect(caller.getById({ id: "non-existent" })).rejects.toThrow(
				TRPCError,
			);
			await expect(caller.getById({ id: "non-existent" })).rejects.toThrow(
				"Calendar not found",
			);
		});
	});
});
