/**
 * Tests for calendar import URL router
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@calendraft/db", () => ({
	default: {
		calendar: {
			findUnique: vi.fn(),
			update: vi.fn(),
			create: vi.fn(),
		},
		event: {
			findMany: vi.fn(),
			deleteMany: vi.fn(),
			create: vi.fn(),
		},
	},
	Prisma: {},
}));

// Mock dependencies
vi.mock("../../lib/url-validator", () => ({
	assertValidExternalUrl: vi.fn(),
}));

vi.mock("../../lib/ics-parser", () => ({
	parseIcsFile: vi.fn(),
}));

vi.mock("../../lib/duplicate-detection", () => ({
	findDuplicatesAgainstExisting: vi.fn(),
}));

vi.mock("../calendar/helpers", () => ({
	createEventFromParsed: vi.fn(),
	validateFileSize: vi.fn(),
}));

vi.mock("../../middleware", () => ({
	verifyCalendarAccess: vi.fn(),
	checkCalendarLimit: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

import prisma from "@calendraft/db";
import type { Context } from "../../context";
import { parseIcsFile } from "../../lib/ics-parser";
import { verifyCalendarAccess } from "../../middleware";
import { createEventFromParsed } from "../calendar/helpers";
import { calendarImportUrlRouter } from "../calendar/import-url";

const mockContext: Context = {
	session: null,
	anonymousId: "anon-test123",
	correlationId: "test-correlation-id",
	userId: "anon-test123",
} as Context;

describe("calendarImportUrlRouter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("refreshFromUrl", () => {
		it("should fetch, parse and import events from source URL", async () => {
			const mockCalendar = {
				id: "calendar-123",
				sourceUrl: "https://example.com/calendar.ics",
				events: [],
			};

			const mockIcsContent =
				"BEGIN:VCALENDAR\nBEGIN:VEVENT\nEND:VEVENT\nEND:VCALENDAR";
			const mockParsedEvents = [
				{
					uid: "event-1",
					title: "Test Event",
					startDate: new Date("2024-01-01T10:00:00Z"),
					endDate: new Date("2024-01-01T11:00:00Z"),
				},
			];

			(verifyCalendarAccess as ReturnType<typeof vi.fn>).mockResolvedValue(
				undefined,
			);
			(
				prisma.calendar.findUnique as ReturnType<typeof vi.fn>
			).mockResolvedValue(mockCalendar);
			(prisma.event.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
				count: 0,
			});
			(prisma.calendar.update as ReturnType<typeof vi.fn>).mockResolvedValue({
				...mockCalendar,
				lastSyncedAt: new Date(),
			});

			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				text: async () => mockIcsContent,
			});

			(parseIcsFile as ReturnType<typeof vi.fn>).mockReturnValue({
				events: mockParsedEvents,
				errors: [],
			});

			(createEventFromParsed as ReturnType<typeof vi.fn>).mockResolvedValue(
				undefined,
			);

			const caller = calendarImportUrlRouter.createCaller(mockContext);
			const result = await caller.refreshFromUrl({
				calendarId: "calendar-123",
				replaceAll: false,
				skipDuplicates: true,
			});

			expect(result.importedEvents).toBe(1);
			expect(result.skippedDuplicates).toBe(0);
			expect(prisma.calendar.update).toHaveBeenCalledWith({
				where: { id: "calendar-123" },
				data: { lastSyncedAt: expect.any(Date) },
			});
		});

		it("should throw error if calendar has no source URL", async () => {
			const mockCalendar = {
				id: "calendar-123",
				sourceUrl: null,
				events: [],
			};

			(verifyCalendarAccess as ReturnType<typeof vi.fn>).mockResolvedValue(
				undefined,
			);
			(
				prisma.calendar.findUnique as ReturnType<typeof vi.fn>
			).mockResolvedValue(mockCalendar);

			const caller = calendarImportUrlRouter.createCaller(mockContext);

			await expect(
				caller.refreshFromUrl({
					calendarId: "calendar-123",
					replaceAll: false,
					skipDuplicates: true,
				}),
			).rejects.toThrow(TRPCError);
			await expect(
				caller.refreshFromUrl({
					calendarId: "calendar-123",
					replaceAll: false,
					skipDuplicates: true,
				}),
			).rejects.toThrow("This calendar has no source URL");
		});
	});
});
