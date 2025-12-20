import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Check,
	Copy,
	ExternalLink,
	Layers,
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

interface ShareCalendarsDialogProps {
	calendarIds: string[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Optional group ID to link the bundle to a group */
	groupId?: string;
}

interface BundleItemProps {
	bundle: {
		id: string;
		name: string | null;
		token: string;
		calendarCount: number;
		isActive: boolean;
		removeDuplicates: boolean;
		accessCount: number;
		lastAccessedAt: string | null;
		createdAt: string;
	};
	copiedId: string | null;
	getShareUrl: (token: string) => string;
	onCopy: (token: string, bundleId: string) => void;
	onToggleActive: (bundleId: string, isActive: boolean) => void;
	onDelete: (bundleId: string) => void;
	isDeleting: boolean;
}

export function ShareCalendarsDialog({
	calendarIds,
	open,
	onOpenChange,
	groupId,
}: ShareCalendarsDialogProps) {
	const queryClient = useQueryClient();
	const [newBundleName, setNewBundleName] = useState("");
	const [removeDuplicates, setRemoveDuplicates] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [bundleIdToDelete, setBundleIdToDelete] = useState<string | null>(null);

	// Get calendars info for display
	const { data: calendarsData } = useQuery({
		...trpc.calendar.list.queryOptions(),
		enabled: open,
	});

	const calendars = calendarsData?.calendars || [];
	const selectedCalendars = calendars.filter((cal) =>
		calendarIds.includes(cal.id),
	);

	// Query existing share bundles
	const { data: shareBundles, isLoading } = useQuery({
		...trpc.share.bundle.list.queryOptions(),
		enabled: open,
	});

	// Filter bundles that contain exactly the selected calendars
	const relevantBundles = shareBundles?.filter((_bundle) => {
		// This is a simplified check - in a real scenario, we'd need to check
		// if the bundle contains exactly these calendars
		return true; // For now, show all bundles
	});

	// Create share bundle mutation
	const createMutation = useMutation(
		trpc.share.bundle.create.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: [["share", "bundle", "list"]],
				});
				setNewBundleName("");
				setRemoveDuplicates(false);
				toast.success("Sharing bundle created");
			},
			onError: (error) => {
				toast.error(error.message || "Error during bundle creation");
			},
		}),
	);

	// Update share bundle mutation
	const updateMutation = useMutation(
		trpc.share.bundle.update.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: [["share", "bundle", "list"]],
				});
			},
			onError: (error) => {
				toast.error(error.message || "Error during update");
			},
		}),
	);

	// Delete share bundle mutation
	const deleteMutation = useMutation(
		trpc.share.bundle.delete.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: [["share", "bundle", "list"]],
				});
				toast.success("Sharing bundle deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Error during deletion");
			},
		}),
	);

	// Build share URL
	// React Compiler will automatically memoize these callbacks
	const getShareUrl = (token: string): string => {
		const baseUrl = window.location.origin;
		return `${baseUrl}/share/${token}`;
	};

	// Copy to clipboard
	const handleCopy = async (token: string, bundleId: string): Promise<void> => {
		const url = getShareUrl(token);
		try {
			await navigator.clipboard.writeText(url);
			setCopiedId(bundleId);
			setTimeout(() => setCopiedId(null), 2000);
			toast.success("Link copied!");
		} catch {
			toast.error("Unable to copy link");
		}
	};

	// Create new bundle
	const handleCreate = (): void => {
		if (calendarIds.length === 0 && !groupId) {
			toast.error("Please select at least one calendar");
			return;
		}

		createMutation.mutate({
			...(groupId ? { groupId } : { calendarIds }),
			name: newBundleName.trim() || undefined,
			removeDuplicates,
		});
	};

	// Toggle bundle active state
	const handleToggleActive = (bundleId: string, isActive: boolean): void => {
		updateMutation.mutate({ id: bundleId, isActive });
	};

	// Delete bundle
	const handleDelete = (bundleId: string): void => {
		setBundleIdToDelete(bundleId);
		setDeleteDialogOpen(true);
	};

	const confirmDelete = (): void => {
		if (bundleIdToDelete) {
			deleteMutation.mutate({ id: bundleIdToDelete });
			setDeleteDialogOpen(false);
			setBundleIdToDelete(null);
		}
	};

	// Generate default name
	const defaultName = `${calendarIds.length} calendars - ${format(new Date(), "MMM d, yyyy", { locale: enUS })}`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Layers className="h-5 w-5" />
						Share {calendarIds.length} calendar
						{calendarIds.length !== 1 ? "s" : ""}
					</DialogTitle>
					<DialogDescription>
						Create a sharing bundle to allow others to download these calendars
						together in a single .ics file
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Selected calendars list */}
					{selectedCalendars && selectedCalendars.length > 0 && (
						<div className="rounded-lg border bg-muted/30 p-3">
							<p className="mb-2 font-medium text-small">Selected calendars:</p>
							<div className="space-y-1">
								{selectedCalendars.map((cal) => (
									<div
										key={cal.id}
										className="flex items-center gap-2 text-muted-foreground text-sm"
									>
										<div
											className="h-2 w-2 rounded-full"
											style={{ backgroundColor: cal.color || "#D4A017" }}
										/>
										<span>{cal.name}</span>
										<span className="text-muted-foreground/60">
											({cal.eventCount} events)
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Create new bundle */}
					<div className="space-y-3">
						<div className="flex gap-2">
							<Input
								placeholder={defaultName}
								value={newBundleName}
								onChange={(e) => setNewBundleName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleCreate()}
								className="flex-1"
							/>
							<Button
								onClick={handleCreate}
								disabled={createMutation.isPending || calendarIds.length === 0}
								size="sm"
							>
								{createMutation.isPending ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Plus className="h-4 w-4" />
								)}
								<span className="ml-2 hidden sm:inline">Create</span>
							</Button>
						</div>

						{/* Remove duplicates option */}
						<div className="flex items-center justify-between rounded-lg border bg-card p-3">
							<div className="space-y-0.5">
								<Label htmlFor="remove-duplicates" className="text-sm">
									Remove duplicate events
								</Label>
								<p className="text-muted-foreground text-xs">
									Automatically remove duplicate events when merging calendars
								</p>
							</div>
							<Switch
								id="remove-duplicates"
								checked={removeDuplicates}
								onCheckedChange={setRemoveDuplicates}
							/>
						</div>

						{calendarIds.length > 10 && (
							<p className="text-muted-foreground text-xs">
								⚠️ Large bundle may take longer to generate
							</p>
						)}
					</div>

					<hr className="border-border" />

					{/* List of share bundles */}
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : relevantBundles && relevantBundles.length > 0 ? (
						<div className="space-y-3">
							{relevantBundles.map((bundle) => (
								<BundleItem
									key={bundle.id}
									bundle={bundle}
									copiedId={copiedId}
									getShareUrl={getShareUrl}
									onCopy={handleCopy}
									onToggleActive={handleToggleActive}
									onDelete={handleDelete}
									isDeleting={deleteMutation.isPending}
								/>
							))}
						</div>
					) : (
						<div className="py-8 text-center text-muted-foreground text-sm">
							<Layers className="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>No sharing bundles</p>
							<p className="text-xs">
								Create a bundle to share these calendars
							</p>
						</div>
					)}
				</div>
			</DialogContent>

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete sharing bundle?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this sharing bundle? This action
							is irreversible.
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

function BundleItem({
	bundle,
	copiedId,
	getShareUrl,
	onCopy,
	onToggleActive,
	onDelete,
	isDeleting,
}: BundleItemProps) {
	return (
		<div className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/5">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="text-xs">
							<Layers className="mr-1 h-3 w-3" />
							Bundle ({bundle.calendarCount})
						</Badge>
						<span className="truncate font-medium text-small">
							{bundle.name || "Unnamed bundle"}
						</span>
						{!bundle.isActive && (
							<Badge variant="secondary" className="text-xs">
								Disabled
							</Badge>
						)}
						{bundle.removeDuplicates && (
							<Badge variant="outline" className="text-xs">
								No duplicates
							</Badge>
						)}
					</div>
					<div className="mt-1 flex items-center gap-2">
						<code className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs sm:max-w-[200px]">
							{getShareUrl(bundle.token)}
						</code>
						<Button
							variant="ghost"
							size="icon"
							className="h-10 min-h-[44px] w-10 sm:h-6 sm:min-h-0 sm:w-6"
							onClick={() => onCopy(bundle.token, bundle.id)}
						>
							{copiedId === bundle.id ? (
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
								href={getShareUrl(bundle.token)}
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink className="h-3 w-3" />
							</a>
						</Button>
					</div>
					<div className="mt-1.5 text-muted-foreground text-xs">
						{bundle.accessCount > 0
							? `${bundle.accessCount} access${bundle.accessCount !== 1 ? "es" : ""}`
							: "Never used"}
						{bundle.lastAccessedAt && (
							<>
								{" "}
								• Last access{" "}
								{format(new Date(bundle.lastAccessedAt), "MMM d 'at' HH:mm", {
									locale: enUS,
								})}
							</>
						)}
						<span className="ml-2 text-muted-foreground/70">
							Created on{" "}
							{format(new Date(bundle.createdAt), "MMM d, yyyy", {
								locale: enUS,
							})}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5">
						<Label htmlFor={`active-${bundle.id}`} className="sr-only">
							Enable/Disable
						</Label>
						<Switch
							id={`active-${bundle.id}`}
							checked={bundle.isActive}
							onCheckedChange={(checked) => {
								onToggleActive(bundle.id, checked);
							}}
						/>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={() => onDelete(bundle.id)}
						disabled={isDeleting}
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
