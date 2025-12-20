// SPDX-License-Identifier: AGPL-3.0
// Copyright (C) 2024 Calendraft
/**
 * Dialog to invite a member to a group by email
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface InviteGroupMemberDialogProps {
	groupId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function InviteGroupMemberDialog({
	groupId,
	open,
	onOpenChange,
}: InviteGroupMemberDialogProps) {
	const queryClient = useQueryClient();
	const [email, setEmail] = useState("");

	const inviteMutation = useMutation(
		trpc.calendar.group.inviteMember.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: [["calendar", "group", "listMembers"]],
				});
				void queryClient.invalidateQueries({
					queryKey: [["calendar", "group", "getById"]],
				});
				toast.success("Invitation sent");
				setEmail("");
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message || "Error sending invitation");
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}
		inviteMutation.mutate({
			groupId,
			userEmail: email.trim(),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite member</DialogTitle>
					<DialogDescription>
						Invite a user to join this group by email. They will receive an
						email with a link to accept the invitation.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email address</Label>
							<Input
								id="email"
								type="email"
								placeholder="user@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								disabled={inviteMutation.isPending}
								required
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={inviteMutation.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={inviteMutation.isPending}>
							{inviteMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Mail className="mr-2 h-4 w-4" />
									Send invitation
								</>
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
