/**
 * Bulk actions toolbar for selected events
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Loader2, Square, Trash2, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";
import { MoveEventDialog } from "./move-event-dialog";

interface BulkActionsBarProps {
	selectedCount: number;
	totalCount: number;
	currentCalendarId: string;
	onSelectAll: () => void;
	onDeselectAll: () => void;
	onExitSelectionMode: () => void;
	selectedIds: Set<string>;
}

export function BulkActionsBar({
	selectedCount,
	totalCount,
	currentCalendarId,
	onSelectAll,
	onDeselectAll,
	onExitSelectionMode,
	selectedIds,
}: BulkActionsBarProps) {
	const queryClient = useQueryClient();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [moveDialogOpen, setMoveDialogOpen] = useState(false);

	// Bulk delete mutation
	const bulkDeleteMutation = useMutation(
		trpc.event.bulkDelete.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.all });
				toast.success(`${data.deletedCount} event(s) deleted`);
				onExitSelectionMode();
			},
			onError: (error) => {
				toast.error(error.message || "Error during deletion");
			},
		}),
	);

	// React Compiler will automatically memoize this callback
	const handleDelete = () => {
		bulkDeleteMutation.mutate({ eventIds: Array.from(selectedIds) });
		setDeleteDialogOpen(false);
	};

	const isAllSelected = selectedCount === totalCount;
	const isPending = bulkDeleteMutation.isPending;

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
					{/* Move to calendar */}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setMoveDialogOpen(true)}
						disabled={isPending || selectedCount === 0}
						className="h-10 min-h-[44px] sm:h-8 sm:min-h-0"
						aria-label={`Move ${selectedCount} selected event${selectedCount !== 1 ? "s" : ""} to another calendar`}
					>
						Move
					</Button>

					{/* Delete */}
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setDeleteDialogOpen(true)}
						disabled={isPending || selectedCount === 0}
						className="h-10 min-h-[44px] sm:h-8 sm:min-h-0"
					>
						{bulkDeleteMutation.isPending ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="mr-2 h-4 w-4" />
						)}
						<span className="hidden sm:inline">Delete</span>
						<span className="sm:hidden">Del</span>
					</Button>

					{/* Exit selection mode */}
					<Button
						variant="ghost"
						size="icon"
						onClick={onExitSelectionMode}
						className="h-10 min-h-[44px] w-10 sm:h-8 sm:min-h-0 sm:w-8"
						disabled={isPending}
						aria-label="Exit selection mode"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			</motion.div>

			{/* Move dialog */}
			<MoveEventDialog
				open={moveDialogOpen}
				onOpenChange={setMoveDialogOpen}
				eventIds={Array.from(selectedIds)}
				currentCalendarId={currentCalendarId}
				eventCount={selectedCount}
			/>

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedCount} event(s)?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This action is irreversible. The selected events will be
							permanently deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className={buttonVariants({ variant: "destructive" })}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
