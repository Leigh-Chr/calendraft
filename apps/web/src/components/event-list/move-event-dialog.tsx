/**
 * Dialog for moving event(s) to another calendar
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCalendars } from "@/hooks/use-storage";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";

/**
 * Type for calendar list items returned by the API
 * Matches the structure from packages/api/src/routers/calendar/core.ts
 */
type CalendarListItem = {
	id: string;
	name: string;
	color?: string | null;
	eventCount: number;
	sourceUrl?: string | null;
	lastSyncedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

interface MoveEventDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	eventIds: string[];
	currentCalendarId: string;
	eventCount?: number; // For display purposes (1 for single, multiple for bulk)
}

export function MoveEventDialog({
	open,
	onOpenChange,
	eventIds,
	currentCalendarId,
	eventCount = eventIds.length,
}: MoveEventDialogProps) {
	const queryClient = useQueryClient();
	const [targetCalendarId, setTargetCalendarId] = useState<string>("");

	// Get calendars for move destination
	const { calendars, isLoading: isLoadingCalendars } = useCalendars();

	// Bulk move mutation
	const bulkMoveMutation = useMutation(
		trpc.event.bulkMove.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.all });
				toast.success(
					`${data.movedCount} event(s) moved to "${data.targetCalendarName}"`,
				);
				onOpenChange(false);
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during move";
				toast.error(message);
			},
		}),
	);

	const handleMove = () => {
		if (!targetCalendarId) return;
		bulkMoveMutation.mutate({
			eventIds,
			targetCalendarId,
		});
	};

	// Filter calendars to exclude current one
	// Type assertion is safe here because useCalendars returns the same structure as CalendarListItem
	const moveDestinations = Array.isArray(calendars)
		? (calendars as unknown as CalendarListItem[]).filter(
				(c) => c.id !== currentCalendarId,
			)
		: [];

	const isPending = bulkMoveMutation.isPending;
	const canMove =
		targetCalendarId &&
		!isPending &&
		moveDestinations &&
		moveDestinations.length > 0;

	const handleOpenChange = (newOpen: boolean) => {
		if (!newOpen) {
			setTargetCalendarId("");
		}
		onOpenChange(newOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Move {eventCount === 1 ? "event" : `${eventCount} events`}
					</DialogTitle>
					<DialogDescription>
						Select the destination calendar for{" "}
						{eventCount === 1 ? "this event" : "these events"}.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					{isLoadingCalendars ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : !moveDestinations || moveDestinations.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
							<CalendarIcon className="h-8 w-8 text-muted-foreground" />
							<p className="text-muted-foreground text-sm">
								No other calendars available. Create a calendar first.
							</p>
						</div>
					) : (
						<Select
							value={targetCalendarId}
							onValueChange={setTargetCalendarId}
							disabled={isPending}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select destination calendar..." />
							</SelectTrigger>
							<SelectContent>
								{moveDestinations.map((cal: CalendarListItem) => (
									<SelectItem key={cal.id} value={cal.id}>
										<div className="flex items-center gap-2">
											{cal.color && (
												<div
													className="h-3 w-3 rounded-full"
													style={{ backgroundColor: cal.color }}
												/>
											)}
											<span>{cal.name}</span>
											<span className="text-muted-foreground text-xs">
												({cal.eventCount} event{cal.eventCount !== 1 ? "s" : ""}
												)
											</span>
										</div>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button onClick={handleMove} disabled={!canMove}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Moving...
							</>
						) : (
							<>
								<ArrowRight className="mr-2 h-4 w-4" />
								Move
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
