/**
 * Bulk actions toolbar for selected calendars
 */

import { useIsMobile } from "@calendraft/react-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	CheckSquare,
	Download,
	Folder,
	GitMerge,
	Link2,
	Loader2,
	MoreHorizontal,
	Square,
	Trash2,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ShareCalendarsDialog } from "@/components/share-calendars-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";
import { CreateGroupDialog } from "./create-group-dialog";

// Mobile actions component
function MobileActions({
	isPending,
	selectedCount,
	canMerge,
	onDelete,
	onCreateGroup,
	onShare,
	onMerge,
	onExport,
	onExit,
}: MobileActionsProps) {
	return (
		<>
			<Button
				variant="destructive"
				size="sm"
				onClick={onDelete}
				disabled={isPending || selectedCount === 0}
				className="h-10 min-h-[44px] sm:h-8 sm:min-h-0"
			>
				{isPending ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<Trash2 className="mr-2 h-4 w-4" />
				)}
				Delete
			</Button>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-10 min-h-[44px] sm:h-8 sm:min-h-0"
					>
						<MoreHorizontal className="h-4 w-4" />
						<span className="sr-only">More actions</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" mobileAlign="start">
					<DropdownMenuItem
						onClick={onCreateGroup}
						disabled={isPending || selectedCount === 0}
					>
						<Folder className="mr-2 h-4 w-4" />
						Save as group
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={onShare}
						disabled={isPending || selectedCount === 0}
					>
						<Link2 className="mr-2 h-4 w-4" />
						Share
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onMerge} disabled={isPending || !canMerge}>
						<GitMerge className="mr-2 h-4 w-4" />
						Merge
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={onExport}
						disabled={isPending || selectedCount === 0}
					>
						<Download className="mr-2 h-4 w-4" />
						Export
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Button
				variant="ghost"
				size="icon"
				onClick={onExit}
				className="h-10 min-h-[44px] w-10 sm:h-8 sm:min-h-0 sm:w-8"
				disabled={isPending}
			>
				<X className="h-4 w-4" />
			</Button>
		</>
	);
}

// Desktop actions component
function DesktopActions({
	isPending,
	selectedCount,
	canMerge,
	onDelete,
	onCreateGroup,
	onShare,
	onMerge,
	onExport,
	onExit,
}: DesktopActionsProps) {
	return (
		<>
			<Button
				variant="outline"
				size="sm"
				onClick={onCreateGroup}
				disabled={isPending || selectedCount === 0}
				className="h-8"
			>
				<Folder className="mr-2 h-4 w-4" />
				Save as group
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onShare}
				disabled={isPending || selectedCount === 0}
				className="h-8"
			>
				<Link2 className="mr-2 h-4 w-4" />
				Share
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onMerge}
				disabled={isPending || !canMerge}
				className="h-8"
			>
				<GitMerge className="mr-2 h-4 w-4" />
				Merge
			</Button>
			<Button
				variant="outline"
				size="sm"
				onClick={onExport}
				disabled={isPending || selectedCount === 0}
				className="h-8"
			>
				<Download className="mr-2 h-4 w-4" />
				Export
			</Button>
			<Button
				variant="destructive"
				size="sm"
				onClick={onDelete}
				disabled={isPending || selectedCount === 0}
				className="h-8"
			>
				{isPending ? (
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
				) : (
					<Trash2 className="mr-2 h-4 w-4" />
				)}
				Delete
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onClick={onExit}
				className="h-8 w-8"
				disabled={isPending}
			>
				<X className="h-4 w-4" />
			</Button>
		</>
	);
}

interface CalendarBulkActionsBarProps {
	selectedCount: number;
	totalCount: number;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onExitSelectionMode: () => void;
	selectedIds: Set<string>;
}

interface MobileActionsProps {
	isPending: boolean;
	selectedCount: number;
	canMerge: boolean;
	onDelete: () => void;
	onCreateGroup: () => void;
	onShare: () => void;
	onMerge: () => void;
	onExport: () => void;
	onExit: () => void;
}

interface DesktopActionsProps {
	isPending: boolean;
	selectedCount: number;
	canMerge: boolean;
	onDelete: () => void;
	onCreateGroup: () => void;
	onShare: () => void;
	onMerge: () => void;
	onExport: () => void;
	onExit: () => void;
}

export function CalendarBulkActionsBar({
	selectedCount,
	totalCount,
	onSelectAll,
	onDeselectAll,
	onExitSelectionMode,
	selectedIds,
}: CalendarBulkActionsBarProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);

	// Bulk delete mutation
	const bulkDeleteMutation = useMutation(
		trpc.calendar.bulkDelete.mutationOptions({
			onSuccess: (data) => {
				void queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.list,
				});
				toast.success(`${data.deletedCount} calendar(s) deleted`);
				onExitSelectionMode();
			},
			onError: (error) => {
				toast.error(error.message || "Error during deletion");
			},
		}),
	);

	const handleDelete = useCallback(() => {
		bulkDeleteMutation.mutate({ calendarIds: Array.from(selectedIds) });
		setDeleteDialogOpen(false);
	}, [bulkDeleteMutation, selectedIds]);

	const handleMerge = useCallback(() => {
		// Navigate to merge page with selected calendars
		const selectedStr = Array.from(selectedIds).join(",");
		navigate({
			to: "/calendars/merge",
			search: { selected: selectedStr },
		});
		onExitSelectionMode();
	}, [navigate, selectedIds, onExitSelectionMode]);

	const handleExport = useCallback(() => {
		// For now, we'll just show a message that this feature is coming
		// In the future, we could implement bulk export
		toast.info("Bulk export feature coming soon");
	}, []);

	const isAllSelected = selectedCount === totalCount;
	const isPending = bulkDeleteMutation.isPending;
	const canMerge = selectedCount >= 2;
	const isMobile = useIsMobile();

	const actionHandlers = {
		onDelete: () => setDeleteDialogOpen(true),
		onCreateGroup: () => setCreateGroupDialogOpen(true),
		onShare: () => setShareDialogOpen(true),
		onMerge: handleMerge,
		onExport: handleExport,
		onExit: onExitSelectionMode,
	};

	return (
		<>
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				className="-mx-4 sticky top-0 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur-sm"
			>
				{/* Selection info */}
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={isAllSelected ? onDeselectAll : onSelectAll}
						className="h-10 min-h-[44px] sm:h-8 sm:min-h-0"
					>
						{isAllSelected ? (
							<CheckSquare className="mr-2 h-4 w-4" />
						) : (
							<Square className="mr-2 h-4 w-4" />
						)}
						{isAllSelected ? "Deselect all" : "Select all"}
					</Button>
					<span className="text-muted-foreground text-sm">
						{selectedCount} of {totalCount} selected
					</span>
				</div>

				<div className="flex-1" />

				{/* Actions */}
				<div className="flex items-center gap-2">
					{isMobile ? (
						<MobileActions
							isPending={isPending}
							selectedCount={selectedCount}
							canMerge={canMerge}
							{...actionHandlers}
						/>
					) : (
						<DesktopActions
							isPending={isPending}
							selectedCount={selectedCount}
							canMerge={canMerge}
							{...actionHandlers}
						/>
					)}
				</div>
			</motion.div>

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedCount} calendar(s)?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action is irreversible. The selected calendars and all their
							events will be permanently deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Share calendars dialog */}
			<ShareCalendarsDialog
				calendarIds={Array.from(selectedIds)}
				open={shareDialogOpen}
				onOpenChange={(open) => {
					setShareDialogOpen(open);
					if (!open) {
						// Optionally exit selection mode after sharing
						// onExitSelectionMode();
					}
				}}
			/>

			{/* Create group dialog */}
			<CreateGroupDialog
				open={createGroupDialogOpen}
				onOpenChange={(open) => {
					setCreateGroupDialogOpen(open);
					if (!open) {
						// Optionally exit selection mode after creating group
						// onExitSelectionMode();
					}
				}}
				initialCalendarIds={Array.from(selectedIds)}
			/>
		</>
	);
}
