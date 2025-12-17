/**
 * Tests for group access verification utilities
 */

import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma (must be before importing from @calendraft/db or middleware)
vi.mock("@calendraft/db", () => ({
	default: {
		calendarGroup: {
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
import {
	isGroupMember,
	isGroupOwner,
	verifyGroupAccess,
	verifyGroupAccessOrThrow,
} from "../access";

describe("verifyGroupAccess", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return no access for anonymous users", async () => {
		const ctx: Context = {
			session: null,
			anonymousId: "anon-test123",
			correlationId: "test-correlation-id",
			userId: "anon-test123",
		};

		const result = await verifyGroupAccess("group-id", ctx);
		expect(result).toEqual({
			hasAccess: false,
			role: null,
			isAccepted: false,
		});
	});

	it("should return access for owner", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "user-123",
			members: [],
		});

		const ctx: Context = {
			session: { user: { id: "user-123" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-123",
		};

		const result = await verifyGroupAccess("group-id", ctx);
		expect(result).toEqual({
			hasAccess: true,
			role: "OWNER",
			isAccepted: true,
		});
	});

	it("should return access for accepted member", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "owner-123",
			members: [
				{
					role: "MEMBER",
					acceptedAt: new Date(),
				},
			],
		});

		const ctx: Context = {
			session: { user: { id: "user-456" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-456",
		};

		const result = await verifyGroupAccess("group-id", ctx);
		expect(result).toEqual({
			hasAccess: true,
			role: "MEMBER",
			isAccepted: true,
		});
	});

	it("should return pending for member with pending invitation", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "owner-123",
			members: [
				{
					role: "MEMBER",
					acceptedAt: null,
				},
			],
		});

		const ctx: Context = {
			session: { user: { id: "user-456" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-456",
		};

		const result = await verifyGroupAccess("group-id", ctx);
		expect(result).toEqual({
			hasAccess: true,
			role: "MEMBER",
			isAccepted: false,
		});
	});
});

describe("verifyGroupAccessOrThrow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should throw NOT_FOUND if group does not exist", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const ctx: Context = {
			session: { user: { id: "user-123" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-123",
		};

		await expect(
			verifyGroupAccessOrThrow("non-existent-id", ctx),
		).rejects.toThrow(TRPCError);
		await expect(
			verifyGroupAccessOrThrow("non-existent-id", ctx),
		).rejects.toThrow("Group not found");
	});

	it("should throw FORBIDDEN if user does not have access", async () => {
		// Mock returns group with members array for each call
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "other-user-id",
			members: [], // User is not owner and not a member
		});

		const ctx: Context = {
			session: { user: { id: "user-123" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-123",
		};

		await expect(verifyGroupAccessOrThrow("group-id", ctx)).rejects.toThrow(
			TRPCError,
		);
		await expect(verifyGroupAccessOrThrow("group-id", ctx)).rejects.toThrow(
			"Access denied",
		);
	});

	it("should throw FORBIDDEN if required role is OWNER but user is MEMBER", async () => {
		// Mock returns group where user is a MEMBER, not OWNER
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "owner-123", // Different from ctx user
			members: [
				{
					role: "MEMBER",
					acceptedAt: new Date(),
				},
			],
		});

		const ctx: Context = {
			session: { user: { id: "user-456" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-456",
		};

		await expect(
			verifyGroupAccessOrThrow("group-id", ctx, "OWNER"),
		).rejects.toThrow(TRPCError);
		await expect(
			verifyGroupAccessOrThrow("group-id", ctx, "OWNER"),
		).rejects.toThrow("Only the group owner");
	});
});

describe("isGroupOwner", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return true for owner", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "user-123",
			members: [],
		});

		const ctx: Context = {
			session: { user: { id: "user-123" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-123",
		};

		const result = await isGroupOwner("group-id", ctx);
		expect(result).toBe(true);
	});

	it("should return false for member", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "owner-123",
			members: [
				{
					role: "MEMBER",
					acceptedAt: new Date(),
				},
			],
		});

		const ctx: Context = {
			session: { user: { id: "user-456" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-456",
		};

		const result = await isGroupOwner("group-id", ctx);
		expect(result).toBe(false);
	});
});

describe("isGroupMember", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return true for accepted member", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "owner-123",
			members: [
				{
					role: "MEMBER",
					acceptedAt: new Date(),
				},
			],
		});

		const ctx: Context = {
			session: { user: { id: "user-456" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-456",
		};

		const result = await isGroupMember("group-id", ctx);
		expect(result).toBe(true);
	});

	it("should return false for pending invitation", async () => {
		(
			prisma.calendarGroup.findUnique as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: "group-id",
			userId: "owner-123",
			members: [
				{
					role: "MEMBER",
					acceptedAt: null,
				},
			],
		});

		const ctx: Context = {
			session: { user: { id: "user-456" } },
			anonymousId: null,
			correlationId: "test-correlation-id",
			userId: "user-456",
		};

		const result = await isGroupMember("group-id", ctx);
		expect(result).toBe(false);
	});
});
