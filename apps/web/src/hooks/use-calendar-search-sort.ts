/**
 * Hook for managing calendar search and sort
 */

import type { useNavigate } from "@tanstack/react-router";
import type {
	CalendarSortBy,
	CalendarSortDirection,
} from "@/components/calendar-list/calendar-filters";
import type { Route } from "@/routes/calendars";

export function useSearchSortHandlers(
	navigate: ReturnType<typeof useNavigate>,
	search: ReturnType<typeof Route.useSearch>,
	sortDirection: CalendarSortDirection,
) {
	const handleKeywordChange = (newKeyword: string) => {
		navigate({
			search: {
				...search,
				q: newKeyword || undefined,
			},
		});
	};

	const handleSortChange = (newSortBy: CalendarSortBy) => {
		const shouldShowDirection =
			newSortBy === "updatedAt" || newSortBy === "createdAt";
		navigate({
			search: {
				...search,
				sortBy: newSortBy,
				sortDirection: shouldShowDirection ? sortDirection : "desc",
			},
		});
	};

	const handleSortDirectionChange = (newDirection: CalendarSortDirection) => {
		navigate({
			search: {
				...search,
				sortDirection: newDirection,
			},
		});
	};

	return {
		handleKeywordChange,
		handleSortChange,
		handleSortDirectionChange,
	};
}
