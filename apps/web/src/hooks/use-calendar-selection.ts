/**
 * Hook for managing calendar selection mode
 */

import { useState } from "react";
import type { CalendarForSort } from "@/lib/calendar-sort";

export function useSelectionHandlers(calendars: CalendarForSort[]) {
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const handleToggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSelectAll = () => {
		setSelectedIds(new Set(calendars.map((c) => c.id)));
	};

	const handleDeselectAll = () => {
		setSelectedIds(new Set());
	};

	const handleExitSelectionMode = () => {
		setSelectionMode(false);
		setSelectedIds(new Set());
	};

	const handleEnterSelectionMode = () => {
		setSelectionMode(true);
	};

	return {
		selectionMode,
		selectedIds,
		handleToggleSelect,
		handleSelectAll,
		handleDeselectAll,
		handleExitSelectionMode,
		handleEnterSelectionMode,
	};
}
