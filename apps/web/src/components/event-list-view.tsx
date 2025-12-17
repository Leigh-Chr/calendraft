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
import { enUS } from "date-fns/locale";
import { Calendar, CheckSquare, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { groupEventsByDate } from "@/lib/date-utils";
import { QUERY_KEYS } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { BulkActionsBar } from "./event-list/bulk-actions-bar";
import { EventCard } from "./event-list/event-card";
import { DateFilterButtons, SearchSortBar } from "./event-list/event-filters";
import { MoveEventDialog } from "./event-list/move-event-dialog";
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
	sortDirection?: FilterState["sortDirection"];
	keyword?: string;
}

/** Callback when filters change - for syncing with URL */
export interface FiltersChangePayload {
	dateFilter: FilterState["dateFilter"];
	sortBy: FilterState["sortBy"];
	sortDirection: FilterState["sortDirection"];
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
		...(initialFilters?.sortDirection && {
			sortDirection: initialFilters.sortDirection,
		}),
		...(initialFilters?.keyword && { keyword: initialFilters.keyword }),
	};

	const [filters, setFilters] = useState<FilterState>(initialState);

	// Sync URL params changes to local state (e.g., browser back/forward)
	useEffect(() => {
		if (!initialFilters) return;

		const newDateFilter = initialFilters.dateFilter ?? "all";
		const newSortBy = initialFilters.sortBy ?? "date";
		const newSortDirection = initialFilters.sortDirection ?? "asc";
		const newKeyword = initialFilters.keyword ?? "";

		setFilters((prev) => {
			// Only update if values actually changed
			const unchanged =
				prev.dateFilter === newDateFilter &&
				prev.sortBy === newSortBy &&
				prev.sortDirection === newSortDirection &&
				prev.keyword === newKeyword;

			if (unchanged) return prev;

			return {
				...prev,
				dateFilter: newDateFilter,
				sortBy: newSortBy,
				sortDirection: newSortDirection,
				keyword: newKeyword,
				...getDateRangeForFilter(newDateFilter, new Date()),
				cursor: undefined,
			};
		});
	}, [initialFilters]);

	// Update filters with automatic cursor reset when filter criteria change
	// React Compiler will automatically memoize these callbacks
	const updateFilters = (
		updates: Partial<FilterState>,
		resetCursor = false,
	) => {
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
					sortDirection: next.sortDirection,
					keyword: next.keyword,
				});
			}

			return next;
		});
	};

	const handleDateFilterChange = (filter: FilterState["dateFilter"]) => {
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
					sortDirection: next.sortDirection,
					keyword: next.keyword,
				});
			}

			return next;
		});
	};

	// Convenience wrappers that auto-reset cursor
	const updateFilterWithReset = (updates: Partial<FilterState>) => {
		updateFilters(updates, true);
	};

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
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
				toast.success("Event deleted");
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during deletion";
				toast.error(message);
			},
		}),
	);

	// React Compiler will automatically memoize this callback
	const handleDelete = (id: string) => {
		if (confirm("Are you sure you want to delete this event?")) {
			mutation.mutate({ id });
		}
	};

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
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
				toast.success("Event duplicated");
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during duplication";
				toast.error(message);
			},
		}),
	);

	// React Compiler will automatically memoize this callback
	const handleDuplicate = (id: string) => {
		mutation.mutate({ id, dayOffset: 0 });
	};

	return { handleDuplicate, isDuplicating: mutation.isPending };
}

/**
 * Hook to manage event move dialog state
 * @param _calendarId - The current calendar ID (for filtering out from destination list)
 */
function useMoveEvent(_calendarId: string) {
	const [moveDialogOpen, setMoveDialogOpen] = useState(false);
	const [eventIdToMove, setEventIdToMove] = useState<string | null>(null);

	// React Compiler will automatically memoize this callback
	const handleMove = (id: string) => {
		setEventIdToMove(id);
		setMoveDialogOpen(true);
	};

	return {
		handleMove,
		moveDialogOpen,
		setMoveDialogOpen,
		eventIdToMove,
	};
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
				dateFrom: startOfWeek(now, { locale: enUS }),
				dateTo: endOfWeek(now, { locale: enUS }),
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
	const { handleMove, moveDialogOpen, setMoveDialogOpen, eventIdToMove } =
		useMoveEvent(calendarId);

	// Selection mode state
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Query with filter state
	const eventsQuery = useQuery({
		...trpc.event.list.queryOptions({
			calendarId,
			sortBy: filters.sortBy,
			sortDirection: filters.sortDirection,
			filterKeyword: filters.keyword || undefined,
			filterDateFrom: filters.dateFrom,
			filterDateTo: filters.dateTo,
			limit: 50,
			cursor: filters.cursor,
		}),
	});

	// React Compiler will automatically memoize this computation
	const events = eventsQuery.data?.events || initialEvents;
	const nextCursor = eventsQuery.data?.nextCursor;

	// React Compiler will automatically memoize these callbacks
	const handleLoadMore = () => {
		if (nextCursor) {
			updateFilters({ cursor: nextCursor });
		}
	};

	// Selection handlers
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
		setSelectedIds(new Set(events.map((e) => e.id)));
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

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center gap-3 sm:gap-2">
				<DateFilterButtons
					currentFilter={filters.dateFilter}
					onFilterChange={handleDateFilterChange}
				/>
				{/* Selection mode toggle */}
				{events.length > 0 && !selectionMode && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleEnterSelectionMode}
						className="ml-auto"
					>
						<CheckSquare className="mr-2 h-4 w-4" />
						Select
					</Button>
				)}
			</div>

			<SearchSortBar
				keyword={filters.keyword}
				sortBy={filters.sortBy}
				sortDirection={filters.sortDirection}
				onKeywordChange={(keyword) => updateFilterWithReset({ keyword })}
				onSortChange={(sortBy) => {
					// Reset sortDirection to "asc" when changing sort type (except for date)
					updateFilterWithReset({
						sortBy,
						sortDirection: sortBy === "date" ? filters.sortDirection : "asc",
					});
				}}
				onSortDirectionChange={(sortDirection) =>
					updateFilterWithReset({ sortDirection })
				}
			/>

			{/* Bulk actions bar */}
			<AnimatePresence>
				{selectionMode && (
					<BulkActionsBar
						selectedCount={selectedIds.size}
						totalCount={events.length}
						currentCalendarId={calendarId}
						selectedIds={selectedIds}
						onSelectAll={handleSelectAll}
						onDeselectAll={handleDeselectAll}
						onExitSelectionMode={handleExitSelectionMode}
					/>
				)}
			</AnimatePresence>

			<EventsList
				events={events}
				calendarId={calendarId}
				handlers={{
					onDelete: handleDelete,
					onDuplicate: handleDuplicate,
					onMove: handleMove,
				}}
				loading={{
					isDeleting,
					isDuplicating,
				}}
				selection={
					selectionMode
						? {
								mode: selectionMode,
								selectedIds,
								onToggleSelect: handleToggleSelect,
							}
						: undefined
				}
			/>

			{/* Move event dialog */}
			{eventIdToMove && (
				<MoveEventDialog
					open={moveDialogOpen}
					onOpenChange={setMoveDialogOpen}
					eventIds={[eventIdToMove]}
					currentCalendarId={calendarId}
					eventCount={1}
				/>
			)}

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
	const isDatePast = isPast(date) && label !== "Today";
	const isToday = label === "Today";

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
						{format(date, "d MMMM", { locale: enUS })}
					</span>
				)}
			</div>
			<div className="h-px flex-1 bg-border" />
			<span className="text-muted-foreground/60 text-xs">
				{eventCount} event{eventCount > 1 ? "s" : ""}
			</span>
		</motion.div>
	);
}

/**
 * Events list with date-based grouping
 * Groups events by day with contextual headers
 * React Compiler will automatically memoize this component
 */
function EventsList({
	events,
	calendarId,
	handlers,
	loading,
	selection,
}: {
	events: EventItem[];
	calendarId: string;
	handlers: {
		onDelete: (id: string) => void;
		onDuplicate: (id: string) => void;
		onMove?: (id: string) => void;
	};
	loading: {
		isDeleting: boolean;
		isDuplicating: boolean;
	};
	selection?: {
		mode: boolean;
		selectedIds?: Set<string>;
		onToggleSelect?: (id: string) => void;
	};
}) {
	// Group events by date
	// React Compiler will automatically memoize this computation
	const groupedEvents = groupEventsByDate(events);

	if (events.length === 0) {
		return (
			<Card>
				<CardContent className="py-10 text-center">
					<p className="text-muted-foreground">No events found</p>
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
									onDelete={handlers.onDelete}
									onDuplicate={handlers.onDuplicate}
									onMove={handlers.onMove}
									isDeleting={loading.isDeleting}
									isDuplicating={loading.isDuplicating}
									selectionMode={selection?.mode ?? false}
									isSelected={selection?.selectedIds?.has(event.id)}
									onToggleSelect={selection?.onToggleSelect}
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
					<>Loading...</>
				) : (
					<>
						Load more
						<ChevronRight className="ml-2 h-4 w-4" />
					</>
				)}
			</Button>
		</div>
	);
}
