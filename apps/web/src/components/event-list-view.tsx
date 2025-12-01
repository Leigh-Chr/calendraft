/**
 * Event list view component - Main container
 * Sub-components are located in ./event-list/
 * Enhanced with date-based grouping for better readability
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	endOfDay,
	endOfMonth,
	endOfWeek,
	format,
	isPast,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { groupEventsByDate, normalizeDate } from "@/lib/date-utils";
import { QUERY_KEYS } from "@/lib/query-keys";
import { TOUR_STEP_IDS } from "@/lib/tour-constants";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { EventCard } from "./event-list/event-card";
import { DateFilterButtons, SearchSortBar } from "./event-list/event-filters";
import {
	type EventItem,
	type FilterState,
	INITIAL_FILTER_STATE,
} from "./event-list/types";

// ----- Types -----

/** Initial filter values that can be provided via URL search params */
export interface InitialFilters {
	dateFilter?: FilterState["dateFilter"];
	sortBy?: FilterState["sortBy"];
	keyword?: string;
}

/** Callback when filters change - for syncing with URL */
export interface FiltersChangePayload {
	dateFilter: FilterState["dateFilter"];
	sortBy: FilterState["sortBy"];
	keyword: string;
}

interface EventListViewProps {
	calendarId: string;
	events: EventItem[];
	/** Initial filter values from URL search params */
	initialFilters?: InitialFilters;
	/** Callback when filters change - used to sync with URL */
	onFiltersChange?: (filters: FiltersChangePayload) => void;
}

// ----- Hooks -----

function useEventFilters(
	initialFilters?: InitialFilters,
	onFiltersChange?: (filters: FiltersChangePayload) => void,
) {
	// Initialize state from URL params if provided
	const initialState: FilterState = {
		...INITIAL_FILTER_STATE,
		...(initialFilters?.dateFilter && {
			dateFilter: initialFilters.dateFilter,
			...getDateRangeForFilter(initialFilters.dateFilter, new Date()),
		}),
		...(initialFilters?.sortBy && { sortBy: initialFilters.sortBy }),
		...(initialFilters?.keyword && { keyword: initialFilters.keyword }),
	};

	const [filters, setFilters] = useState<FilterState>(initialState);

	// Sync URL params changes to local state (e.g., browser back/forward)
	useEffect(() => {
		if (!initialFilters) return;

		const newDateFilter = initialFilters.dateFilter ?? "all";
		const newSortBy = initialFilters.sortBy ?? "date";
		const newKeyword = initialFilters.keyword ?? "";

		setFilters((prev) => {
			// Only update if values actually changed
			const unchanged =
				prev.dateFilter === newDateFilter &&
				prev.sortBy === newSortBy &&
				prev.keyword === newKeyword;

			if (unchanged) return prev;

			return {
				...prev,
				dateFilter: newDateFilter,
				sortBy: newSortBy,
				keyword: newKeyword,
				...getDateRangeForFilter(newDateFilter, new Date()),
				cursor: undefined,
			};
		});
	}, [initialFilters]);

	// Update filters with automatic cursor reset when filter criteria change
	const updateFilters = useCallback(
		(updates: Partial<FilterState>, resetCursor = false) => {
			setFilters((prev) => {
				const next = {
					...prev,
					...updates,
					// Reset cursor when filter criteria change (not when loading more)
					...(resetCursor ? { cursor: undefined } : {}),
				};

				// Notify parent of filter changes (for URL sync)
				if (resetCursor && onFiltersChange) {
					onFiltersChange({
						dateFilter: next.dateFilter,
						sortBy: next.sortBy,
						keyword: next.keyword,
					});
				}

				return next;
			});
		},
		[onFiltersChange],
	);

	const handleDateFilterChange = useCallback(
		(filter: FilterState["dateFilter"]) => {
			const now = new Date();
			const dateRange = getDateRangeForFilter(filter, now);
			setFilters((prev) => {
				const next = {
					...prev,
					dateFilter: filter,
					...dateRange,
					cursor: undefined, // Always reset cursor on date filter change
				};

				// Notify parent of filter changes (for URL sync)
				if (onFiltersChange) {
					onFiltersChange({
						dateFilter: next.dateFilter,
						sortBy: next.sortBy,
						keyword: next.keyword,
					});
				}

				return next;
			});
		},
		[onFiltersChange],
	);

	// Convenience wrappers that auto-reset cursor
	const updateFilterWithReset = useCallback(
		(updates: Partial<FilterState>) => {
			updateFilters(updates, true);
		},
		[updateFilters],
	);

	return {
		filters,
		updateFilters,
		updateFilterWithReset,
		handleDateFilterChange,
	};
}

function useDeleteEvent(calendarId: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation(
		trpc.event.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Événement supprimé");
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: "Erreur lors de la suppression";
				toast.error(message);
			},
		}),
	);

	const handleDelete = useCallback(
		(id: string) => {
			if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
				mutation.mutate({ id });
			}
		},
		[mutation],
	);

	return { handleDelete, isDeleting: mutation.isPending };
}

function useDuplicateEvent(calendarId: string) {
	const queryClient = useQueryClient();

	const mutation = useMutation(
		trpc.event.duplicate.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Événement dupliqué");
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: "Erreur lors de la duplication";
				toast.error(message);
			},
		}),
	);

	const handleDuplicate = useCallback(
		(id: string) => {
			mutation.mutate({ id, dayOffset: 0 });
		},
		[mutation],
	);

	return { handleDuplicate, isDuplicating: mutation.isPending };
}

// ----- Helper Functions -----

function getDateRangeForFilter(
	filter: FilterState["dateFilter"],
	now: Date,
): { dateFrom: Date | undefined; dateTo: Date | undefined } {
	switch (filter) {
		case "today":
			return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
		case "week":
			return {
				dateFrom: startOfWeek(now, { locale: fr }),
				dateTo: endOfWeek(now, { locale: fr }),
			};
		case "month":
			return { dateFrom: startOfMonth(now), dateTo: endOfMonth(now) };
		default:
			return { dateFrom: undefined, dateTo: undefined };
	}
}

// ----- Main Component -----

export function EventListView({
	calendarId,
	events: initialEvents,
	initialFilters,
	onFiltersChange,
}: EventListViewProps) {
	const {
		filters,
		updateFilters,
		updateFilterWithReset,
		handleDateFilterChange,
	} = useEventFilters(initialFilters, onFiltersChange);
	const { handleDelete, isDeleting } = useDeleteEvent(calendarId);
	const { handleDuplicate, isDuplicating } = useDuplicateEvent(calendarId);

	// Query with filter state
	const eventsQuery = useQuery({
		...trpc.event.list.queryOptions({
			calendarId,
			sortBy: filters.sortBy,
			filterKeyword: filters.keyword || undefined,
			filterDateFrom: filters.dateFrom,
			filterDateTo: filters.dateTo,
			limit: 50,
			cursor: filters.cursor,
		}),
	});

	// Memoized events list
	const events = useMemo(
		() => eventsQuery.data?.events || initialEvents,
		[eventsQuery.data?.events, initialEvents],
	);
	const nextCursor = eventsQuery.data?.nextCursor;

	const handleLoadMore = useCallback(() => {
		if (nextCursor) {
			updateFilters({ cursor: nextCursor });
		}
	}, [nextCursor, updateFilters]);

	return (
		<div className="space-y-4">
			<DateFilterButtons
				id={TOUR_STEP_IDS.DATE_FILTERS}
				currentFilter={filters.dateFilter}
				onFilterChange={handleDateFilterChange}
			/>

			<SearchSortBar
				id={TOUR_STEP_IDS.SEARCH_BAR}
				keyword={filters.keyword}
				sortBy={filters.sortBy}
				onKeywordChange={(keyword) => updateFilterWithReset({ keyword })}
				onSortChange={(sortBy) => updateFilterWithReset({ sortBy })}
			/>

			<EventsList
				events={events}
				calendarId={calendarId}
				onDelete={handleDelete}
				onDuplicate={handleDuplicate}
				isDeleting={isDeleting}
				isDuplicating={isDuplicating}
			/>

			{nextCursor && (
				<LoadMoreButton
					onClick={handleLoadMore}
					isLoading={eventsQuery.isFetching}
				/>
			)}
		</div>
	);
}

// ----- Sub-components -----

/**
 * Date group header component
 * Shows contextual date label with visual hierarchy
 */
function DateGroupHeader({
	label,
	date,
	eventCount,
}: {
	label: string;
	date: Date;
	eventCount: number;
}) {
	const isDatePast = isPast(date) && label !== "Aujourd'hui";
	const isToday = label === "Aujourd'hui";

	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			className={cn(
				"sticky top-0 z-10 flex items-center gap-3 py-3",
				"bg-gradient-to-r from-background via-background to-transparent",
			)}
		>
			<div
				className={cn(
					"flex items-center gap-2",
					isDatePast && "text-muted-foreground",
				)}
			>
				<Calendar
					className={cn(
						"h-4 w-4",
						isToday ? "text-primary" : "text-muted-foreground",
					)}
				/>
				<span
					className={cn(
						"font-semibold text-sm",
						isToday && "text-primary",
						isDatePast && "text-muted-foreground",
					)}
				>
					{label}
				</span>
				{!isToday && (
					<span className="text-muted-foreground/60 text-xs">
						{format(date, "d MMMM", { locale: fr })}
					</span>
				)}
			</div>
			<div className="h-px flex-1 bg-border" />
			<span className="text-muted-foreground/60 text-xs">
				{eventCount} événement{eventCount > 1 ? "s" : ""}
			</span>
		</motion.div>
	);
}

/**
 * Events list with date-based grouping
 * Groups events by day with contextual headers
 */
function EventsList({
	events,
	calendarId,
	onDelete,
	onDuplicate,
	isDeleting,
	isDuplicating,
}: {
	events: EventItem[];
	calendarId: string;
	onDelete: (id: string) => void;
	onDuplicate: (id: string) => void;
	isDeleting: boolean;
	isDuplicating: boolean;
}) {
	// Group events by date
	const groupedEvents = useMemo(() => {
		return groupEventsByDate(events);
	}, [events]);

	if (events.length === 0) {
		return (
			<Card>
				<CardContent className="py-10 text-center">
					<p className="text-muted-foreground">Aucun événement trouvé</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-1">
			<AnimatePresence mode="popLayout">
				{Array.from(groupedEvents.entries()).map(
					([dateKey, { label, date, events: dayEvents }]) => (
						<div key={dateKey} className="space-y-2">
							<DateGroupHeader
								label={label}
								date={date}
								eventCount={dayEvents.length}
							/>
							{dayEvents.map((event) => (
								<EventCard
									key={event.id}
									event={event}
									calendarId={calendarId}
									onDelete={onDelete}
									onDuplicate={onDuplicate}
									isDeleting={isDeleting}
									isDuplicating={isDuplicating}
								/>
							))}
						</div>
					),
				)}
			</AnimatePresence>
		</div>
	);
}

function LoadMoreButton({
	onClick,
	isLoading,
}: {
	onClick: () => void;
	isLoading: boolean;
}) {
	return (
		<div className="mt-4 flex justify-center">
			<Button variant="outline" onClick={onClick} disabled={isLoading}>
				{isLoading ? (
					<>Chargement...</>
				) : (
					<>
						Charger plus
						<ChevronRight className="ml-2 h-4 w-4" />
					</>
				)}
			</Button>
		</div>
	);
}
