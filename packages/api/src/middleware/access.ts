// SPDX-License-Identifier: AGPL-3.0
// Copyright (C) 2024 Calendraft
/**
 * Group and calendar access verification utilities
 * Handles access control for shared calendar groups
 */

import prisma from "@calendraft/db";
import { TRPCError } from "@trpc/server";
import type { Context } from "../context";

export type GroupAccessResult = {
	hasAccess: boolean;
	role: "OWNER" | "MEMBER" | null;
	isAccepted: boolean;
};

/**
 * Verify if user has access to a calendar group
 * Returns access information including role and acceptance status
 */
export async function verifyGroupAccess(
	groupId: string,
	ctx: Context,
): Promise<GroupAccessResult> {
	// Only authenticated users can be group members
	if (!ctx.session?.user?.id) {
		return {
			hasAccess: false,
			role: null,
			isAccepted: false,
		};
	}

	const userId = ctx.session.user.id;

	// Find the group
	const group = await prisma.calendarGroup.findUnique({
		where: { id: groupId },
		select: {
			id: true,
			userId: true,
			members: {
				where: { userId },
				select: {
					role: true,
					acceptedAt: true,
				},
			},
		},
	});

	if (!group) {
		return {
			hasAccess: false,
			role: null,
			isAccepted: false,
		};
	}

	// Check if user is the owner (creator) of the group
	if (group.userId === userId) {
		return {
			hasAccess: true,
			role: "OWNER",
			isAccepted: true,
		};
	}

	// Check if user is a member
	const member = group.members[0];
	if (member) {
		return {
			hasAccess: true,
			role: member.role,
			isAccepted: member.acceptedAt !== null,
		};
	}

	// No access
	return {
		hasAccess: false,
		role: null,
		isAccepted: false,
	};
}

/**
 * Check if user is the owner of a group
 */
export async function isGroupOwner(
	groupId: string,
	ctx: Context,
): Promise<boolean> {
	const access = await verifyGroupAccess(groupId, ctx);
	return access.hasAccess && access.role === "OWNER";
}

/**
 * Check if user is a member (owner or regular member) of a group with accepted invitation
 */
export async function isGroupMember(
	groupId: string,
	ctx: Context,
): Promise<boolean> {
	const access = await verifyGroupAccess(groupId, ctx);
	return access.hasAccess && access.isAccepted;
}

/**
 * Verify group access and throw error if access denied
 * Returns the group if access is granted
 */
export async function verifyGroupAccessOrThrow(
	groupId: string,
	ctx: Context,
	requiredRole?: "OWNER" | "MEMBER",
): Promise<{
	id: string;
	userId: string | null;
}> {
	const group = await prisma.calendarGroup.findUnique({
		where: { id: groupId },
		select: { id: true, userId: true },
	});

	if (!group) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Group not found",
		});
	}

	const access = await verifyGroupAccess(groupId, ctx);

	if (!access.hasAccess || !access.isAccepted) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Access denied to this group",
		});
	}

	// Check role requirement if specified
	if (requiredRole === "OWNER" && access.role !== "OWNER") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only the group owner can perform this action",
		});
	}

	return group;
}
