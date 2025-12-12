import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	stripSearchParams,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { formatDistanceToNow } from "date-fns";
import {
	ArrowLeft,
	CalendarDays,
	Calendar as CalendarIcon,
	CalendarRange,
	Download,
	Link2,
	List,
	Loader2,
	Merge,
	Plus,
	RefreshCw,
	Sparkles,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccountPrompt } from "@/components/account-prompt";
import { CalendarView } from "@/components/calendar-month-view";
import { EventListView } from "@/components/event-list-view";
import { ExportCalendarDialog } from "@/components/export-calendar-dialog";
import { ShareCalendarDialog } from "@/components/share-calendar-dialog";
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
import { useCalendar } from "@/hooks/use-storage";
import { normalizeDate } from "@/lib/date-utils";
import { QUERY_KEYS } from "@/lib/query-keys";
import type { CalendarSubView } from "@/lib/search-params";
import {
	calendarViewDefaults,
	calendarViewSearchSchema,
} from "@/lib/search-params";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/$calendarId")({
	component: CalendarViewComponent,
	validateSearch: zodValidator(calendarViewSearchSchema),
	search: {
		middlewares: [stripSearchParams(calendarViewDefaults)],
	},
	head: () => ({
		meta: [
			{ title: "Calendar - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complex component with multiple state and effects
function CalendarViewComponent() {
	const { calendarId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate();
	const location = useLocation();
	const queryClient = useQueryClient();
	const [cleanDialogOpen, setCleanDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [exportDialogOpen, setExportDialogOpen] = useState(false);

	// URL-driven view mode
	const viewMode = search.view;

	// Helper for updating search params on current route
	// React Compiler will automatically memoize this callback
	const updateSearch = (updates: Partial<typeof search>) => {
		navigate({
			to: ".",
			search: { ...search, ...updates },
		});
	};

	const { calendar, isLoading } = useCalendar(calendarId);
	const eventsQuery = useQuery({
		...trpc.event.list.queryOptions({ calendarId, sortBy: "date" }),
		enabled: !!calendarId,
	});

	// React Compiler will automatically memoize this computation
	const normalizedEvents = (() => {
		const rawEvents = eventsQuery.data?.events || calendar?.events || [];
		return rawEvents.map((e) => ({
			...e,
			startDate: normalizeDate(e.startDate),
			endDate: normalizeDate(e.endDate),
		}));
	})();

	const eventCount = normalizedEvents.length;

	const cleanDuplicatesMutation = useMutation(
		trpc.calendar.cleanDuplicates.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				if (data.removedCount > 0) {
					toast.success(
						`${data.removedCount} duplicate(s) removed. ${data.remainingEvents} event(s) remaining.`,
					);
				} else {
					toast.info("No duplicates found in this calendar.");
				}
				setCleanDialogOpen(false);
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: "Error during duplicate cleanup";
				toast.error(message);
			},
		}),
	);

	const refreshFromUrlMutation = useMutation(
		trpc.calendar.refreshFromUrl.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.list });

				toast.success(
					`Calendar refreshed! ${data.importedEvents} event(s) imported, ${data.skippedDuplicates} duplicate(s) skipped.`,
				);
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during refresh";
				toast.error(message);
			},
		}),
	);

	// React Compiler will automatically memoize these callbacks
	const handleCleanDuplicates = () => {
		cleanDuplicatesMutation.mutate({ calendarId });
	};

	const handleRefreshFromUrl = () => {
		refreshFromUrlMutation.mutate({
			calendarId,
			replaceAll: false,
			skipDuplicates: true,
		});
	};

	// Check if we're on a child route (like /events/new or /import)
	// If so, render the child route via Outlet
	const isChildRoute =
		location.pathname !== `/calendars/${calendarId}` &&
		(location.pathname.startsWith(`/calendars/${calendarId}/events/`) ||
			location.pathname.startsWith(`/calendars/${calendarId}/import`));

	if (isChildRoute) {
		return <Outlet />;
	}

	if (isLoading) {
		return (
			<div className="relative min-h-[calc(100vh-4rem)]">
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-30" />
				</div>
				<div className="container mx-auto max-w-6xl px-4 py-10">
					<div className="text-center text-muted-foreground">Loading...</div>
				</div>
			</div>
		);
	}

	if (!calendar) {
		return (
			<div className="relative min-h-[calc(100vh-4rem)]">
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-30" />
				</div>
				<div className="container mx-auto max-w-6xl px-4 py-10">
					<div className="text-center text-muted-foreground">
						Calendar not found
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-25" />
			</div>

			<div className="container mx-auto max-w-6xl px-4 py-10">
				<AccountPrompt variant="banner" />

				<div className="mb-6 flex flex-wrap items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/calendars" })}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-heading-1">{calendar.name}</h1>
						<p className="text-muted-foreground">{eventCount} event(s)</p>
					</div>
					<div className="ml-auto flex flex-wrap items-center gap-2">
						{/* Primary action */}
						<Button
							onClick={() =>
								navigate({ to: `/calendars/${calendarId}/events/new` })
							}
							size="sm"
						>
							<Plus className="mr-2 h-4 w-4" />
							Add an event
						</Button>
						{/* Secondary actions */}
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								navigate({ to: `/calendars/${calendarId}/import` })
							}
						>
							<Upload className="mr-2 h-4 w-4" />
							Import
						</Button>
						{/* Refresh button - only shown for calendars with a source URL */}
						{calendar.sourceUrl && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleRefreshFromUrl}
								disabled={refreshFromUrlMutation.isPending}
								title={
									calendar.lastSyncedAt
										? `Last synced ${formatDistanceToNow(new Date(calendar.lastSyncedAt), { addSuffix: true })}. Click to refresh.`
										: `Refresh from ${calendar.sourceUrl}`
								}
							>
								{refreshFromUrlMutation.isPending ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="mr-2 h-4 w-4" />
								)}
								Refresh
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={() => setCleanDialogOpen(true)}
						>
							<Sparkles className="mr-2 h-4 w-4" />
							Clean up
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								navigate({
									to: "/calendars/merge",
									search: { selected: calendarId },
								})
							}
						>
							<Merge className="mr-2 h-4 w-4" />
							Merge
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setExportDialogOpen(true)}
						>
							<Download className="mr-2 h-4 w-4" />
							Export
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setShareDialogOpen(true)}
						>
							<Link2 className="mr-2 h-4 w-4" />
							Share
						</Button>
					</div>
				</div>

				<div className="mb-4 flex items-center gap-2">
					{/* Main view toggle: List vs Calendar */}
					<div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
						<Button
							variant={viewMode === "list" ? "default" : "ghost"}
							size="sm"
							className="h-8"
							onClick={() => updateSearch({ view: "list" })}
						>
							<List className="mr-2 h-4 w-4" />
							List
						</Button>
						<Button
							variant={viewMode === "calendar" ? "default" : "ghost"}
							size="sm"
							className="h-8"
							onClick={() => updateSearch({ view: "calendar" })}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							Calendar
						</Button>
					</div>

					{/* Calendar sub-view toggle: Month / Week / Day */}
					{viewMode === "calendar" && (
						<div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
							<Button
								variant={search.calendarView === "month" ? "default" : "ghost"}
								size="sm"
								className="h-8"
								onClick={() => updateSearch({ calendarView: "month" })}
								title="Month view"
							>
								<CalendarIcon className="h-4 w-4" />
								<span className="ml-2 hidden sm:inline">Month</span>
							</Button>
							<Button
								variant={search.calendarView === "week" ? "default" : "ghost"}
								size="sm"
								className="h-8"
								onClick={() => updateSearch({ calendarView: "week" })}
								title="Week view"
							>
								<CalendarRange className="h-4 w-4" />
								<span className="ml-2 hidden sm:inline">Week</span>
							</Button>
							<Button
								variant={search.calendarView === "day" ? "default" : "ghost"}
								size="sm"
								className="h-8"
								onClick={() => updateSearch({ calendarView: "day" })}
								title="Day view"
							>
								<CalendarDays className="h-4 w-4" />
								<span className="ml-2 hidden sm:inline">Day</span>
							</Button>
						</div>
					)}
				</div>

				{viewMode === "list" ? (
					<EventListView
						calendarId={calendarId}
						events={normalizedEvents}
						initialFilters={{
							dateFilter: search.dateFilter,
							sortBy: search.sortBy,
							sortDirection: search.sortDirection,
							keyword: search.q || "",
						}}
						onFiltersChange={(filters) => {
							updateSearch({
								dateFilter: filters.dateFilter,
								sortBy: filters.sortBy,
								sortDirection: filters.sortDirection,
								q: filters.keyword,
							});
						}}
					/>
				) : (
					<CalendarView
						calendarId={calendarId}
						events={normalizedEvents}
						calendarColor={calendar.color}
						initialDate={search.date}
						onDateChange={(date) => updateSearch({ date })}
						initialView={search.calendarView}
						onViewChange={(view) =>
							updateSearch({ calendarView: view as CalendarSubView })
						}
					/>
				)}

				<AlertDialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Clean up duplicates</AlertDialogTitle>
							<AlertDialogDescription>
								This will remove all duplicate events (same title and same
								times). This action is irreversible. Continue?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleCleanDuplicates}
								disabled={cleanDuplicatesMutation.isPending}
							>
								{cleanDuplicatesMutation.isPending ? "Cleaning..." : "Clean up"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<ShareCalendarDialog
					calendarId={calendarId}
					calendarName={calendar.name}
					open={shareDialogOpen}
					onOpenChange={setShareDialogOpen}
				/>

				<ExportCalendarDialog
					calendarId={calendarId}
					calendarName={calendar.name}
					open={exportDialogOpen}
					onOpenChange={setExportDialogOpen}
				/>
			</div>
		</div>
	);
}
