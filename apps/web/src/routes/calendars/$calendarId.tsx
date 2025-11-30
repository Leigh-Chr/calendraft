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
	Calendar as CalendarIcon,
	Download,
	List,
	Merge,
	Plus,
	Sparkles,
	Upload,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AccountPrompt } from "@/components/account-prompt";
import { CalendarMonthView } from "@/components/calendar-month-view";
import { EventListView } from "@/components/event-list-view";
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
import {
	calendarViewDefaults,
	calendarViewSearchSchema,
} from "@/lib/search-params";
import { trpc, trpcClient } from "@/utils/trpc";

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

	const handleExport = useCallback(async () => {
		try {
			const data = await trpcClient.calendar.exportIcs.query({
				id: calendarId,
			});
			// Download the ICS file
			const blob = new Blob([data.icsContent], { type: "text/calendar" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${data.calendarName}.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("Calendrier exporté avec succès");
		} catch (error: unknown) {
			const message =
				error instanceof Error ? error.message : "Erreur lors de l'export";
			toast.error(message);
		}
	}, [calendarId]);

	const handleCleanDuplicates = useCallback(() => {
		cleanDuplicatesMutation.mutate({ calendarId });
	}, [cleanDuplicatesMutation, calendarId]);

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
			<div className="container mx-auto max-w-6xl px-4 py-10">
				<div className="text-center">Chargement...</div>
			</div>
		);
	}

	if (!calendar) {
		return (
			<div className="container mx-auto max-w-6xl px-4 py-10">
				<div className="text-center">Calendrier non trouvé</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-6xl px-4 py-10">
			<AccountPrompt variant="banner" />

			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">{calendar.name}</h1>
					<p className="text-muted-foreground">{eventCount} événement(s)</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							navigate({ to: `/calendars/${calendarId}/events/new` })
						}
					>
						<Plus className="mr-2 h-4 w-4" />
						Ajouter un événement
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => navigate({ to: `/calendars/${calendarId}/import` })}
					>
						<Upload className="mr-2 h-4 w-4" />
						Importer
					</Button>
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
					<Button variant="outline" size="sm" onClick={handleExport}>
						<Download className="mr-2 h-4 w-4" />
						Exporter
					</Button>
				</div>
			</div>

			<div className="mb-4 flex gap-2">
				<Button
					variant={viewMode === "list" ? "default" : "outline"}
					size="sm"
					onClick={() => updateSearch({ view: "list" })}
				>
					<List className="mr-2 h-4 w-4" />
					Liste
				</Button>
				<Button
					variant={viewMode === "calendar" ? "default" : "outline"}
					size="sm"
					onClick={() => updateSearch({ view: "calendar" })}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					Calendrier
				</Button>
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
				<CalendarMonthView
					calendarId={calendarId}
					events={normalizedEvents}
					initialDate={search.date}
					onDateChange={(date) => updateSearch({ date })}
				/>
			)}

			<AlertDialog open={cleanDialogOpen} onOpenChange={setCleanDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Nettoyer les doublons</AlertDialogTitle>
						<AlertDialogDescription>
							Cela supprimera tous les événements en double (même titre et mêmes
							horaires). Cette action est irréversible. Continuer ?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleCleanDuplicates}
							disabled={cleanDuplicatesMutation.isPending}
						>
							{cleanDuplicatesMutation.isPending ? "Nettoyage..." : "Nettoyer"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
