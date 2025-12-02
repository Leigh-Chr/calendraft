import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	stripSearchParams,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import {
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
import { useCallback, useMemo, useState } from "react";
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
import { TOUR_STEP_IDS } from "@/lib/tour-constants";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/$calendarId")({
	component: CalendarViewComponent,
	validateSearch: zodValidator(calendarViewSearchSchema),
	search: {
		middlewares: [stripSearchParams(calendarViewDefaults)],
	},
	head: () => ({
		meta: [
			{ title: "Calendrier - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

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
	const updateSearch = useCallback(
		(updates: Partial<typeof search>) => {
			navigate({
				to: ".",
				search: { ...search, ...updates },
			});
		},
		[navigate, search],
	);

	const { calendar, isLoading } = useCalendar(calendarId);
	const eventsQuery = useQuery({
		...trpc.event.list.queryOptions({ calendarId, sortBy: "date" }),
		enabled: !!calendarId,
	});

	// Memoize event transformation to avoid recalculating on every render
	const normalizedEvents = useMemo(() => {
		const rawEvents = eventsQuery.data?.events || calendar?.events || [];
		return rawEvents.map((e) => ({
			...e,
			startDate: normalizeDate(e.startDate),
			endDate: normalizeDate(e.endDate),
		}));
	}, [eventsQuery.data?.events, calendar?.events]);

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
						`${data.removedCount} doublon(s) supprimé(s). ${data.remainingEvents} événement(s) restant(s).`,
					);
				} else {
					toast.info("Aucun doublon trouvé dans ce calendrier.");
				}
				setCleanDialogOpen(false);
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: "Erreur lors du nettoyage des doublons";
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
					`Calendrier actualisé ! ${data.importedEvents} nouveau(x) événement(s), ${data.skippedDuplicates} doublon(s) ignoré(s).`,
				);
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: "Erreur lors de l'actualisation";
				toast.error(message);
			},
		}),
	);

	const handleCleanDuplicates = useCallback(() => {
		cleanDuplicatesMutation.mutate({ calendarId });
	}, [cleanDuplicatesMutation, calendarId]);

	const handleRefreshFromUrl = useCallback(() => {
		refreshFromUrlMutation.mutate({
			calendarId,
			replaceAll: false,
			skipDuplicates: true,
		});
	}, [refreshFromUrlMutation, calendarId]);

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
					<div className="text-center text-muted-foreground">Chargement...</div>
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
						Calendrier non trouvé
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

				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="font-bold text-3xl">{calendar.name}</h1>
						<p className="text-muted-foreground">{eventCount} événement(s)</p>
					</div>
					<div className="flex gap-2">
						<Button
							id={TOUR_STEP_IDS.ADD_EVENT_BUTTON}
							variant="outline"
							size="sm"
							onClick={() =>
								navigate({ to: `/calendars/${calendarId}/events/new` })
							}
						>
							<Plus className="mr-2 h-4 w-4" />
							Ajouter un événement
						</Button>
						<div id={TOUR_STEP_IDS.ACTION_BUTTONS} className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									navigate({ to: `/calendars/${calendarId}/import` })
								}
							>
								<Upload className="mr-2 h-4 w-4" />
								Importer
							</Button>
							{/* Refresh button - only shown for calendars with a source URL */}
							{calendar.sourceUrl && (
								<Button
									variant="outline"
									size="sm"
									onClick={handleRefreshFromUrl}
									disabled={refreshFromUrlMutation.isPending}
									title={`Actualiser depuis ${calendar.sourceUrl}`}
								>
									{refreshFromUrlMutation.isPending ? (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									) : (
										<RefreshCw className="mr-2 h-4 w-4" />
									)}
									Actualiser
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCleanDialogOpen(true)}
							>
								<Sparkles className="mr-2 h-4 w-4" />
								Nettoyer
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
								Fusionner
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setExportDialogOpen(true)}
							>
								<Download className="mr-2 h-4 w-4" />
								Exporter
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShareDialogOpen(true)}
							>
								<Link2 className="mr-2 h-4 w-4" />
								Partager
							</Button>
						</div>
					</div>
				</div>

				<div
					id={TOUR_STEP_IDS.VIEW_TOGGLE}
					className="mb-4 flex items-center gap-2"
				>
					{/* Main view toggle: List vs Calendar */}
					<div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
						<Button
							variant={viewMode === "list" ? "default" : "ghost"}
							size="sm"
							className="h-8"
							onClick={() => updateSearch({ view: "list" })}
						>
							<List className="mr-2 h-4 w-4" />
							Liste
						</Button>
						<Button
							variant={viewMode === "calendar" ? "default" : "ghost"}
							size="sm"
							className="h-8"
							onClick={() => updateSearch({ view: "calendar" })}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							Calendrier
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
								title="Vue mois"
							>
								<CalendarIcon className="h-4 w-4" />
								<span className="ml-2 hidden sm:inline">Mois</span>
							</Button>
							<Button
								variant={search.calendarView === "week" ? "default" : "ghost"}
								size="sm"
								className="h-8"
								onClick={() => updateSearch({ calendarView: "week" })}
								title="Vue semaine"
							>
								<CalendarRange className="h-4 w-4" />
								<span className="ml-2 hidden sm:inline">Semaine</span>
							</Button>
							<Button
								variant={search.calendarView === "day" ? "default" : "ghost"}
								size="sm"
								className="h-8"
								onClick={() => updateSearch({ calendarView: "day" })}
								title="Vue jour"
							>
								<CalendarDays className="h-4 w-4" />
								<span className="ml-2 hidden sm:inline">Jour</span>
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
							keyword: search.q || "",
						}}
						onFiltersChange={(filters) => {
							updateSearch({
								dateFilter: filters.dateFilter,
								sortBy: filters.sortBy,
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
							<AlertDialogTitle>Nettoyer les doublons</AlertDialogTitle>
							<AlertDialogDescription>
								Cela supprimera tous les événements en double (même titre et
								mêmes horaires). Cette action est irréversible. Continuer ?
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Annuler</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleCleanDuplicates}
								disabled={cleanDuplicatesMutation.isPending}
							>
								{cleanDuplicatesMutation.isPending
									? "Nettoyage..."
									: "Nettoyer"}
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
