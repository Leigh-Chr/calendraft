// SPDX-License-Identifier: AGPL-3.0
// Copyright (C) 2024 Calendraft
/**
 * Route to accept a group invitation
 */

import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/groups/$groupId/accept-invitation")({
	component: AcceptInvitationComponent,
	head: () => ({
		meta: [
			{ title: "Accept Invitation - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

function AcceptInvitationComponent() {
	const { groupId } = Route.useParams();
	const navigate = useNavigate();
	const [accepted, setAccepted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const acceptMutation = useMutation(
		trpc.calendar.group.acceptInvitation.mutationOptions({
			onSuccess: (data) => {
				setAccepted(true);
				toast.success(`You've joined "${data.groupName}"`);
				// Redirect to group page after a short delay
				setTimeout(() => {
					navigate({ to: `/calendars/groups/${groupId}` });
				}, 2000);
			},
			onError: (err) => {
				setError(err.message || "Error accepting invitation");
				toast.error(err.message || "Error accepting invitation");
			},
		}),
	);

	useEffect(() => {
		// Automatically accept invitation when component mounts
		acceptMutation.mutate({ groupId });
		// mutate is stable from useMutation, but we include it for correctness
	}, [groupId, acceptMutation.mutate]);

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
			</div>
			<div className="container mx-auto max-w-2xl px-4 py-6 sm:py-10">
				<Card>
					<CardHeader>
						<CardTitle>Accept Invitation</CardTitle>
						<CardDescription>
							Processing your group invitation...
						</CardDescription>
					</CardHeader>
					<CardContent>
						{acceptMutation.isPending && (
							<div className="flex flex-col items-center justify-center py-8">
								<Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
								<p className="text-muted-foreground">Accepting invitation...</p>
							</div>
						)}

						{accepted && (
							<div className="flex flex-col items-center justify-center py-8">
								<CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
								<p className="mb-4 text-center font-medium">
									Invitation accepted successfully!
								</p>
								<p className="mb-4 text-center text-muted-foreground text-sm">
									Redirecting to the group...
								</p>
								<Button
									onClick={() =>
										navigate({ to: `/calendars/groups/${groupId}` })
									}
								>
									Go to group
								</Button>
							</div>
						)}

						{error && (
							<div className="flex flex-col items-center justify-center py-8">
								<XCircle className="mb-4 h-12 w-12 text-destructive" />
								<p className="mb-4 text-center font-medium text-destructive">
									{error}
								</p>
								<Button
									variant="outline"
									onClick={() => navigate({ to: "/calendars" })}
								>
									Go to calendars
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
