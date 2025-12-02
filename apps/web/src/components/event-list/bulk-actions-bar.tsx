/**
 * Bulk actions toolbar for selected events
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ArrowRight,
	CheckSquare,
	Loader2,
	Square,
	Trash2,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";

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
	const [moveCalendarId, setMoveCalendarId] = useState<string>("");

	// Get calendars for move destination
	const { data: calendars } = useQuery(trpc.calendar.list.queryOptions());

	// Bulk delete mutation
	const bulkDeleteMutation = useMutation(
		trpc.event.bulkDelete.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.all });
				toast.success(`${data.deletedCount} événement(s) supprimé(s)`);
				onExitSelectionMode();
			},
			onError: (error) => {
				toast.error(error.message || "Erreur lors de la suppression");
			},
		}),
	);

	// Bulk move mutation
	const bulkMoveMutation = useMutation(
		trpc.event.bulkMove.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.all });
				toast.success(
					`${data.movedCount} événement(s) déplacé(s) vers "${data.targetCalendarName}"`,
				);
				onExitSelectionMode();
			},
			onError: (error) => {
				toast.error(error.message || "Erreur lors du déplacement");
			},
		}),
	);

	const handleDelete = useCallback(() => {
		bulkDeleteMutation.mutate({ eventIds: Array.from(selectedIds) });
		setDeleteDialogOpen(false);
	}, [bulkDeleteMutation, selectedIds]);

	const handleMove = useCallback(() => {
		if (!moveCalendarId) return;
		bulkMoveMutation.mutate({
			eventIds: Array.from(selectedIds),
			targetCalendarId: moveCalendarId,
		});
		setMoveCalendarId("");
	}, [bulkMoveMutation, selectedIds, moveCalendarId]);

	const isAllSelected = selectedCount === totalCount;
	const isPending = bulkDeleteMutation.isPending || bulkMoveMutation.isPending;

	// Filter calendars to exclude current one for move
	const moveDestinations = calendars?.filter((c) => c.id !== currentCalendarId);

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
						{isAllSelected ? "Tout désélectionner" : "Tout sélectionner"}
					</Button>
					<span className="text-muted-foreground text-sm">
						{selectedCount} sur {totalCount} sélectionné(s)
					</span>
				</div>

				<div className="flex-1" />

				{/* Actions */}
				<div className="flex items-center gap-2">
					{/* Move to calendar */}
					{moveDestinations && moveDestinations.length > 0 && (
						<div className="flex items-center gap-2">
							<Select
								value={moveCalendarId}
								onValueChange={setMoveCalendarId}
								disabled={isPending || selectedCount === 0}
							>
								<SelectTrigger className="h-8 w-[180px]">
									<SelectValue placeholder="Déplacer vers..." />
								</SelectTrigger>
								<SelectContent>
									{moveDestinations.map((cal) => (
										<SelectItem key={cal.id} value={cal.id}>
											{cal.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								variant="outline"
								size="sm"
								onClick={handleMove}
								disabled={!moveCalendarId || isPending || selectedCount === 0}
								className="h-8"
							>
								{bulkMoveMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<ArrowRight className="mr-2 h-4 w-4" />
								)}
								Déplacer
							</Button>
						</div>
					)}

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
						Supprimer
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
							Supprimer {selectedCount} événement(s) ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action est irréversible. Les événements sélectionnés seront
							définitivement supprimés.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
