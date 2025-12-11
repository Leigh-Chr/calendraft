/**
 * Hook for managing calendar dialogs (edit/delete)
 */

import { useState } from "react";
import { toast } from "sonner";
import type { useDeleteCalendar, useUpdateCalendar } from "@/hooks/use-storage";

type DialogState =
	| { type: "delete"; calendar: { id: string; name: string } }
	| {
			type: "edit";
			calendar: { id: string; name: string; color?: string | null };
			newName: string;
			newColor: string | null;
	  }
	| null;

export function useDialogHandlers(
	deleteCalendar: ReturnType<typeof useDeleteCalendar>["deleteCalendar"],
	updateCalendar: ReturnType<typeof useUpdateCalendar>["updateCalendar"],
) {
	const [dialog, setDialog] = useState<DialogState>(null);

	const openDeleteDialog = (id: string, name: string) => {
		setDialog({ type: "delete", calendar: { id, name } });
	};

	const openEditDialog = (id: string, name: string, color?: string | null) => {
		setDialog({
			type: "edit",
			calendar: { id, name, color },
			newName: name,
			newColor: color || null,
		});
	};

	const closeDialog = () => {
		setDialog(null);
	};

	const handleEditNameChange = (value: string) => {
		setDialog((prev) => {
			if (prev?.type === "edit") {
				return { ...prev, newName: value };
			}
			return prev;
		});
	};

	const handleEditColorChange = (value: string | null) => {
		setDialog((prev) => {
			if (prev?.type === "edit") {
				return { ...prev, newColor: value };
			}
			return prev;
		});
	};

	const confirmDelete = () => {
		if (dialog?.type === "delete") {
			deleteCalendar({ id: dialog.calendar.id });
			closeDialog();
		}
	};

	const confirmEdit = async () => {
		if (dialog?.type === "edit") {
			const trimmedName = dialog.newName.trim();
			if (trimmedName) {
				await updateCalendar({
					id: dialog.calendar.id,
					name: trimmedName,
					color: dialog.newColor,
				});
				closeDialog();
			} else {
				toast.error("Name cannot be empty");
			}
		}
	};

	return {
		dialog,
		openDeleteDialog,
		openEditDialog,
		closeDialog,
		handleEditNameChange,
		handleEditColorChange,
		confirmDelete,
		confirmEdit,
	};
}
