/**
 * Bulk actions toolbar for selected calendars
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	CheckSquare,
	Download,
	Folder,
	GitMerge,
	Link2,
	Loader2,
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
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";
import { CreateGroupDialog } from "./create-group-dialog";

interface CalendarBulkActionsBarProps {
	selectedCount: number;
	totalCount: number;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onExitSelectionMode: () => void;
	selectedIds: Set<string>;
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
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.list });
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
						className="h-8"
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
					{/* Save as group */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCreateGroupDialogOpen(true)}
						disabled={isPending || selectedCount === 0}
						className="h-8"
					>
						<Folder className="mr-2 h-4 w-4" />
						Save as group
					</Button>

					{/* Share calendars */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShareDialogOpen(true)}
						disabled={isPending || selectedCount === 0}
						className="h-8"
					>
						<Link2 className="mr-2 h-4 w-4" />
						Share
					</Button>

					{/* Merge calendars */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleMerge}
						disabled={isPending || !canMerge}
						className="h-8"
					>
						<GitMerge className="mr-2 h-4 w-4" />
						Merge
					</Button>

					{/* Export (placeholder for future feature) */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleExport}
						disabled={isPending || selectedCount === 0}
						className="h-8"
					>
						<Download className="mr-2 h-4 w-4" />
						Export
					</Button>

					{/* Delete */}
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setDeleteDialogOpen(true)}
						disabled={isPending || selectedCount === 0}
						className="h-8"
					>
						{bulkDeleteMutation.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="mr-2 h-4 w-4" />
						)}
						Delete
					</Button>

					{/* Exit selection mode */}
					<Button
						variant="ghost"
						size="icon"
						onClick={onExitSelectionMode}
						className="h-8 w-8"
						disabled={isPending}
					>
						<X className="h-4 w-4" />
					</Button>
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
						<AlertDialogAction onClick={handleDelete} variant="destructive">
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
