// SPDX-License-Identifier: AGPL-3.0
// Copyright (C) 2024 Calendraft
/**
 * Group members list component
 * Displays members with roles and actions (remove, leave)
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Loader2, LogOut, Trash2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface GroupMembersListProps {
	groupId: string;
	isOwner: boolean;
	currentUserId?: string;
}

type Member = {
	id: string;
	userId: string;
	role: "OWNER" | "MEMBER";
	invitedBy: string;
	invitedAt: string | Date; // Can be string (from API) or Date (parsed)
	acceptedAt: string | Date | null; // Can be string (from API) or Date (parsed)
	user: {
		id: string;
		email: string;
		name: string | null;
	} | null;
	inviter: {
		id: string;
		name: string | null;
		email: string;
	} | null;
};

interface MemberCardProps {
	member: Member;
	currentUserId?: string;
	isOwner: boolean;
	onRemove: (member: Member) => void;
	onLeave: () => void;
	removeMemberMutation: ReturnType<
		typeof useMutation<
			{ success: boolean },
			unknown,
			{ groupId: string; userId: string },
			unknown
		>
	>;
	leaveGroupMutation: ReturnType<
		typeof useMutation<
			{ success: boolean },
			unknown,
			{ groupId: string },
			unknown
		>
	>;
}

function MemberCard({
	member,
	currentUserId,
	isOwner,
	onRemove,
	onLeave,
	removeMemberMutation,
	leaveGroupMutation,
}: MemberCardProps) {
	const isCurrentUser = member.userId === currentUserId;
	const isPending =
		member.acceptedAt === null ||
		member.acceptedAt === undefined ||
		(member.acceptedAt instanceof Date &&
			Number.isNaN(member.acceptedAt.getTime()));
	const canRemove = isOwner && !isCurrentUser && member.role !== "OWNER";
	const canLeave = !isOwner && isCurrentUser && member.role === "MEMBER";

	return (
		<div className="flex items-center justify-between rounded-lg border p-3">
			<div className="flex-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">
						{member.user?.name || member.user?.email || "Unknown"}
					</span>
					<Badge variant={member.role === "OWNER" ? "default" : "secondary"}>
						{member.role}
					</Badge>
					{isPending ? (
						<Badge variant="outline" className="gap-1">
							<UserX className="h-3 w-3" />
							Pending
						</Badge>
					) : (
						<Badge variant="outline" className="gap-1">
							<UserCheck className="h-3 w-3" />
							Accepted
						</Badge>
					)}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{member.user?.email}
				</div>
				{member.inviter && (
					<div className="mt-1 text-muted-foreground text-xs">
						Invited by {member.inviter.name || member.inviter.email} on{" "}
						{format(
							member.invitedAt instanceof Date
								? member.invitedAt
								: new Date(member.invitedAt),
							"MMM d, yyyy",
							{ locale: enUS },
						)}
					</div>
				)}
			</div>
			<div className="flex items-center gap-2">
				{canRemove && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onRemove(member)}
						disabled={removeMemberMutation.isPending}
					>
						{removeMemberMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="h-4 w-4" />
						)}
					</Button>
				)}
				{canLeave && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onLeave}
						disabled={leaveGroupMutation.isPending}
					>
						{leaveGroupMutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<>
								<LogOut className="mr-2 h-4 w-4" />
								Leave
							</>
						)}
					</Button>
				)}
			</div>
		</div>
	);
}

export function GroupMembersList({
	groupId,
	isOwner,
	currentUserId,
}: GroupMembersListProps) {
	const queryClient = useQueryClient();
	const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
	const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
	const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

	// Fetch members
	const { data: members, isLoading } = useQuery({
		...trpc.calendar.group.listMembers.queryOptions({ groupId }),
	});

	// Remove member mutation
	const removeMemberMutation = useMutation(
		trpc.calendar.group.removeMember.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group", "listMembers"]],
				});
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group", "getById"]],
				});
				toast.success("Member removed");
				setRemoveDialogOpen(false);
				setMemberToRemove(null);
			},
			onError: (error) => {
				toast.error(error.message || "Error removing member");
			},
		}),
	);

	// Leave group mutation
	const leaveGroupMutation = useMutation(
		trpc.calendar.group.leaveGroup.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("You left the group");
				// Navigate will be handled by parent component
			},
			onError: (error) => {
				toast.error(error.message || "Error leaving group");
			},
		}),
	);

	const handleRemoveClick = (member: Member) => {
		setMemberToRemove(member);
		setRemoveDialogOpen(true);
	};

	const handleLeaveClick = () => {
		setLeaveDialogOpen(true);
	};

	const handleRemoveConfirm = () => {
		if (memberToRemove) {
			removeMemberMutation.mutate({
				groupId,
				userId: memberToRemove.userId,
			});
		}
	};

	const handleLeaveConfirm = () => {
		leaveGroupMutation.mutate({ groupId });
	};

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-16 w-full" />
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	const membersArray: Member[] = members || [];

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Members</CardTitle>
					<CardDescription>
						{membersArray.length} member{membersArray.length !== 1 ? "s" : ""}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{membersArray.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No members in this group
						</p>
					) : (
						<div className="space-y-3">
							{membersArray.map((member) => (
								<MemberCard
									key={member.id}
									member={member}
									currentUserId={currentUserId}
									isOwner={isOwner}
									onRemove={handleRemoveClick}
									onLeave={handleLeaveClick}
									removeMemberMutation={removeMemberMutation}
									leaveGroupMutation={leaveGroupMutation}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Remove member confirmation */}
			<AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove member?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove{" "}
							<strong>
								{memberToRemove?.user?.name || memberToRemove?.user?.email}
							</strong>{" "}
							from this group? They will lose access to all calendars in this
							group.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveConfirm}
							disabled={removeMemberMutation.isPending}
						>
							{removeMemberMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Removing...
								</>
							) : (
								"Remove"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Leave group confirmation */}
			<AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Leave group?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to leave this group? You will lose access to
							all calendars in this group.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleLeaveConfirm}
							disabled={leaveGroupMutation.isPending}
						>
							{leaveGroupMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Leaving...
								</>
							) : (
								"Leave"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
