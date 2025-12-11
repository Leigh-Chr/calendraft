/**
 * Create/Edit Calendar Group Dialog
 * Allows users to create or edit calendar groups
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ColorPicker } from "@/components/ui/color-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

interface CreateGroupDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Pre-selected calendar IDs (for creating from selection) */
	initialCalendarIds?: string[];
	/** Group to edit (if provided, dialog is in edit mode) */
	groupToEdit?: {
		id: string;
		name: string;
		description?: string | null;
		color?: string | null;
	};
}

export function CreateGroupDialog({
	open,
	onOpenChange,
	initialCalendarIds = [],
	groupToEdit,
}: CreateGroupDialogProps) {
	const queryClient = useQueryClient();
	const isEditMode = !!groupToEdit;

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [color, setColor] = useState<string | null>(null);
	const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
		new Set(),
	);

	// Get all calendars
	const { data: calendarsData } = useQuery({
		...trpc.calendar.list.queryOptions(),
		enabled: open,
	});

	const calendars = calendarsData?.calendars || [];

	// Get group details if editing
	const { data: groupDetails } = useQuery({
		...trpc.calendar.group.getById.queryOptions({ id: groupToEdit?.id || "" }),
		enabled: open && isEditMode && !!groupToEdit?.id,
	});

	// Initialize form when dialog opens or group changes
	useEffect(() => {
		if (open) {
			if (isEditMode && groupDetails) {
				setName(groupDetails.name);
				setDescription(groupDetails.description || "");
				setColor(groupDetails.color || null);
				const calendarsArray = Array.isArray(groupDetails.calendars)
					? groupDetails.calendars
					: [];
				setSelectedCalendarIds(new Set(calendarsArray.map((c) => c.id)));
			} else {
				setName("");
				setDescription("");
				setColor(null);
				setSelectedCalendarIds(new Set(initialCalendarIds));
			}
		}
	}, [open, isEditMode, groupDetails, initialCalendarIds]);

	// Create mutation
	const createMutation = useMutation(
		trpc.calendar.group.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("Group created successfully");
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message || "Error creating group");
			},
		}),
	);

	// Update mutation
	const updateMutation = useMutation(
		trpc.calendar.group.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("Group updated successfully");
				onOpenChange(false);
			},
			onError: (error) => {
				toast.error(error.message || "Error updating group");
			},
		}),
	);

	// Add calendars mutation
	const addCalendarsMutation = useMutation(
		trpc.calendar.group.addCalendars.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("Calendars added to group");
			},
			onError: (error) => {
				toast.error(error.message || "Error adding calendars");
			},
		}),
	);

	// Remove calendars mutation
	const removeCalendarsMutation = useMutation(
		trpc.calendar.group.removeCalendars.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("Calendars removed from group");
			},
			onError: (error) => {
				toast.error(error.message || "Error removing calendars");
			},
		}),
	);

	// React Compiler will automatically memoize these callbacks
	const handleToggleCalendar = (calendarId: string): void => {
		setSelectedCalendarIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(calendarId)) {
				newSet.delete(calendarId);
			} else {
				newSet.add(calendarId);
			}
			return newSet;
		});
	};

	// Helper function to update calendars in edit mode
	const updateGroupCalendars = (groupId: string): void => {
		if (!groupDetails) return;

		const calendarsArray = Array.isArray(groupDetails.calendars)
			? groupDetails.calendars
			: [];
		const currentIds = new Set(calendarsArray.map((c) => c.id));
		const newIds = selectedCalendarIds;

		// Find calendars to add
		const toAdd = Array.from(newIds).filter((id) => !currentIds.has(id));
		// Find calendars to remove
		const toRemove = Array.from(currentIds).filter((id) => !newIds.has(id));

		// Add new calendars
		if (toAdd.length > 0) {
			addCalendarsMutation.mutate({
				id: groupId,
				calendarIds: toAdd,
			});
		}

		// Remove calendars
		if (toRemove.length > 0) {
			removeCalendarsMutation.mutate({
				id: groupId,
				calendarIds: toRemove,
			});
		}
	};

	// Helper function to handle edit mode submission
	const handleEditSubmit = (): void => {
		if (!groupToEdit) return;

		// Update group metadata
		updateMutation.mutate({
			id: groupToEdit.id,
			name: name.trim(),
			description: description.trim() || null,
			color: color || null,
		});

		// Update calendars if changed
		updateGroupCalendars(groupToEdit.id);
	};

	// Helper function to handle create mode submission
	const handleCreateSubmit = (): void => {
		if (selectedCalendarIds.size === 0) {
			toast.error("Please select at least one calendar");
			return;
		}
		createMutation.mutate({
			name: name.trim(),
			description: description.trim() || undefined,
			color: color || undefined,
			calendarIds: Array.from(selectedCalendarIds),
		});
	};

	const handleSubmit = (): void => {
		if (!name.trim()) {
			toast.error("Please enter a group name");
			return;
		}

		if (isEditMode && groupToEdit) {
			handleEditSubmit();
		} else {
			handleCreateSubmit();
		}
	};

	const isPending =
		createMutation.isPending ||
		updateMutation.isPending ||
		addCalendarsMutation.isPending ||
		removeCalendarsMutation.isPending;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-lg flex-col">
				<DialogHeader className="shrink-0">
					<DialogTitle className="flex items-center gap-2">
						<Folder className="h-5 w-5" />
						{isEditMode ? "Edit group" : "Create group"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update the group name, description, color, and calendars."
							: "Organize your calendars into groups for easier management."}
					</DialogDescription>
				</DialogHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
					{/* Name */}
					<div className="shrink-0 space-y-2">
						<Label htmlFor="group-name">Name *</Label>
						<Input
							id="group-name"
							placeholder="e.g., Work calendars, Personal"
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
							disabled={isPending}
						/>
					</div>

					{/* Description */}
					<div className="shrink-0 space-y-2">
						<Label htmlFor="group-description">Description</Label>
						<Textarea
							id="group-description"
							placeholder="Optional description for this group"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							disabled={isPending}
						/>
					</div>

					{/* Color */}
					<div className="shrink-0 space-y-2">
						<Label htmlFor="group-color">Color</Label>
						<ColorPicker
							value={color || undefined}
							onChange={setColor}
							disabled={isPending}
						/>
					</div>

					{/* Calendars selection */}
					{
						<div className="flex min-h-0 flex-1 flex-col space-y-2 overflow-hidden">
							<Label className="shrink-0">
								Select calendars ({selectedCalendarIds.size} selected)
							</Label>
							<div className="max-h-[300px] flex-1 overflow-y-auto rounded-md border">
								<div className="space-y-2 p-4">
									{calendars.map((calendar) => {
										const isSelected = selectedCalendarIds.has(calendar.id);
										return (
											<div
												key={calendar.id}
												className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent/50"
											>
												<Checkbox
													checked={isSelected}
													onCheckedChange={() =>
														handleToggleCalendar(calendar.id)
													}
													disabled={isPending}
												/>
												<div
													className="h-3 w-3 shrink-0 rounded-full"
													style={{
														backgroundColor: calendar.color || "#D4A017",
													}}
												/>
												<div className="min-w-0 flex-1">
													<p className="truncate font-medium text-sm">
														{calendar.name}
													</p>
													<p className="text-muted-foreground text-xs">
														{calendar.eventCount} event
														{calendar.eventCount !== 1 ? "s" : ""}
													</p>
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					}
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-2 border-t pt-4">
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{isEditMode ? "Updating..." : "Creating..."}
							</>
						) : isEditMode ? (
							"Update"
						) : (
							"Create"
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
