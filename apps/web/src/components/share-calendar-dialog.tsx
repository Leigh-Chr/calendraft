import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Check,
	Copy,
	ExternalLink,
	Link2,
	Loader2,
	Plus,
	Trash2,
} from "lucide-react";
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
import { Button, buttonVariants } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface ShareCalendarDialogProps {
	calendarId: string;
	calendarName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ShareCalendarDialog({
	calendarId,
	calendarName,
	open,
	onOpenChange,
}: ShareCalendarDialogProps) {
	const queryClient = useQueryClient();
	const [newLinkName, setNewLinkName] = useState("");
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [linkIdToDelete, setLinkIdToDelete] = useState<string | null>(null);

	// Query existing share links
	const { data: shareLinks, isLoading } = useQuery({
		...trpc.share.list.queryOptions({ calendarId }),
		enabled: open,
	});

	// Create share link mutation
	const createMutation = useMutation(
		trpc.share.create.mutationOptions({
			onSuccess: () => {
				// Invalidate using the same key structure tRPC uses
				queryClient.invalidateQueries({
					queryKey: [["share", "list"]],
				});
				setNewLinkName("");
				toast.success("Sharing link created");
			},
			onError: (error) => {
				toast.error(error.message || "Error during link creation");
			},
		}),
	);

	// Update share link mutation
	const updateMutation = useMutation(
		trpc.share.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["share", "list"]],
				});
			},
			onError: (error) => {
				toast.error(error.message || "Error during update");
			},
		}),
	);

	// Delete share link mutation
	const deleteMutation = useMutation(
		trpc.share.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["share", "list"]],
				});
				toast.success("Sharing link deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Error during deletion");
			},
		}),
	);

	// Build share URL
	// React Compiler will automatically memoize these callbacks
	const getShareUrl = (token: string) => {
		const baseUrl = window.location.origin;
		return `${baseUrl}/share/${token}`;
	};

	// Copy to clipboard
	const handleCopy = async (token: string, linkId: string) => {
		const url = getShareUrl(token);
		try {
			await navigator.clipboard.writeText(url);
			setCopiedId(linkId);
			setTimeout(() => setCopiedId(null), 2000);
			toast.success("Link copied!");
		} catch {
			toast.error("Unable to copy link");
		}
	};

	// Create new link
	const handleCreate = () => {
		createMutation.mutate({
			calendarId,
			name: newLinkName.trim() || undefined,
		});
	};

	// Toggle link active state
	const handleToggleActive = (linkId: string, isActive: boolean) => {
		updateMutation.mutate({ id: linkId, isActive });
	};

	// Delete link
	const handleDelete = (linkId: string) => {
		setLinkIdToDelete(linkId);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = () => {
		if (linkIdToDelete) {
			deleteMutation.mutate({ id: linkIdToDelete });
			setDeleteDialogOpen(false);
			setLinkIdToDelete(null);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						Share « {calendarName} »
					</DialogTitle>
					<DialogDescription>
						Create sharing links to allow others to download this calendar in
						.ics format
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Create new link */}
					<div className="flex gap-2">
						<Input
							placeholder="Link name (optional)"
							value={newLinkName}
							onChange={(e) => setNewLinkName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleCreate()}
							className="flex-1"
						/>
						<Button
							onClick={handleCreate}
							disabled={createMutation.isPending}
							size="sm"
							className="min-h-[44px] sm:min-h-0"
						>
							{createMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							<span className="ml-2 hidden sm:inline">Create</span>
						</Button>
					</div>

					<hr className="border-border" />

					{/* List of share links */}
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : shareLinks && shareLinks.length > 0 ? (
						<div className="space-y-3">
							{/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex rendering logic */}
							{shareLinks.map((link) => (
								<div
									key={link.id}
									className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/5"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="truncate font-medium text-sm">
													{link.name || "Unnamed link"}
												</span>
												{!link.isActive && (
													<Badge variant="secondary" className="text-xs">
														Disabled
													</Badge>
												)}
											</div>
											<div className="mt-1 flex items-center gap-2">
												<code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs sm:max-w-[200px]">
													{getShareUrl(link.token)}
												</code>
												<Button
													variant="ghost"
													size="icon"
													className="h-10 min-h-[44px] w-10 sm:h-6 sm:min-h-0 sm:w-6"
													onClick={() => handleCopy(link.token, link.id)}
												>
													{copiedId === link.id ? (
														<Check className="h-4 w-4 text-green-500 sm:h-3 sm:w-3" />
													) : (
														<Copy className="h-4 w-4 sm:h-3 sm:w-3" />
													)}
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-10 min-h-[44px] w-10 sm:h-6 sm:min-h-0 sm:w-6"
													asChild
												>
													<a
														href={getShareUrl(link.token)}
														target="_blank"
														rel="noopener noreferrer"
													>
														<ExternalLink className="h-4 w-4 sm:h-3 sm:w-3" />
													</a>
												</Button>
											</div>
											<div className="mt-1.5 text-muted-foreground text-xs">
												{link.accessCount > 0
													? `${link.accessCount} access${link.accessCount !== 1 ? "es" : ""}`
													: "Never used"}
												{link.lastAccessedAt && (
													<>
														{" "}
														• Last access{" "}
														{format(
															new Date(link.lastAccessedAt),
															"MMM d 'at' HH:mm",
															{ locale: enUS },
														)}
													</>
												)}
												<span className="ml-2 text-muted-foreground/70">
													Created on{" "}
													{format(new Date(link.createdAt), "MMM d, yyyy", {
														locale: enUS,
													})}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<div className="flex items-center gap-1.5">
												<Label
													htmlFor={`active-${link.id}`}
													className="sr-only"
												>
													Enable/Disable
												</Label>
												<Switch
													id={`active-${link.id}`}
													checked={link.isActive}
													onCheckedChange={(checked) =>
														handleToggleActive(link.id, checked)
													}
												/>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-10 min-h-[44px] w-10 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:min-h-0 sm:w-8"
												onClick={() => handleDelete(link.id)}
												disabled={deleteMutation.isPending}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="py-8 text-center text-muted-foreground text-sm">
							<Link2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>No sharing links</p>
							<p className="text-xs">Create a link to share this calendar</p>
						</div>
					)}
				</div>
			</DialogContent>

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete sharing link?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this sharing link? This action is
							irreversible.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className={buttonVariants({ variant: "destructive" })}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Dialog>
	);
}
