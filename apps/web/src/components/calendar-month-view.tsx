import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import moment from "moment";
import "moment/locale/fr";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	Calendar,
	type EventProps,
	momentLocalizer,
	type View,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { toast } from "sonner";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { QUERY_KEYS } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { QuickCreateEvent, useQuickCreate } from "./quick-create-event";
import "./calendar-month-view.css";

// Configure moment locale
moment.locale("fr");
const localizer = momentLocalizer(moment);

// Type for calendar events
interface CalendarEvent {
	id: string;
	title: string;
	startDate: Date;
	endDate: Date;
	description?: string | null;
	location?: string | null;
	color?: string | null;
}

// Type for react-big-calendar events
interface RBCEvent {
	id: string;
	title: string;
	start: Date;
	end: Date;
	resource: CalendarEvent;
}

// Create typed drag and drop calendar
const DnDCalendar = withDragAndDrop<RBCEvent>(Calendar<RBCEvent>);

interface CalendarViewProps {
	calendarId: string;
	events: CalendarEvent[];
	/** Calendar color (used as default for events without their own color) */
	calendarColor?: string | null;
	/** Initial date to display (ISO date string YYYY-MM-DD) */
	initialDate?: string;
	/** Callback when the viewed date changes */
	onDateChange?: (date: string) => void;
	/** Initial view mode (month, week, day) */
	initialView?: View;
	/** Callback when the view mode changes */
	onViewChange?: (view: View) => void;
}

// Custom event component with hover preview
function EventWithHover({
	event,
	calendarId,
}: EventProps<RBCEvent> & { calendarId: string }) {
	const navigate = useNavigate();

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			navigate({
				to: `/calendars/${calendarId}/events/${event.resource.id}`,
			});
		},
		[calendarId, event.resource.id, navigate],
	);

	return (
		<HoverCard openDelay={300} closeDelay={100}>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className="rbc-event-content w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-inherit"
					onClick={handleClick}
				>
					{event.title}
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				className="w-80 p-4"
				side="right"
				align="start"
				sideOffset={8}
			>
				<div className="space-y-3">
					{/* Event title */}
					<div>
						<h4 className="font-semibold text-base">{event.title}</h4>
						<p className="mt-1 text-muted-foreground text-sm">
							{format(event.start, "EEEE d MMMM yyyy", { locale: fr })}
						</p>
						<p className="text-muted-foreground text-sm">
							{format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
						</p>
					</div>

					{/* Location */}
					{event.resource.location && (
						<div className="flex items-start gap-2 text-sm">
							<span className="text-muted-foreground">📍</span>
							<span>{event.resource.location}</span>
						</div>
					)}

					{/* Description preview */}
					{event.resource.description && (
						<p className="line-clamp-3 text-muted-foreground text-sm">
							{event.resource.description}
						</p>
					)}

					{/* Quick actions hint */}
					<p className="text-muted-foreground/60 text-xs">
						Cliquez pour modifier • Glissez pour déplacer
					</p>
				</div>
			</HoverCardContent>
		</HoverCard>
	);
}

/**
 * CalendarView - Calendar visualization component with month, week, and day views
 * Supports drag & drop, event resizing, and quick create
 */
export function CalendarView({
	calendarId,
	events,
	calendarColor,
	initialDate,
	onDateChange,
	initialView = "month",
	onViewChange,
}: CalendarViewProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const quickCreate = useQuickCreate();

	// Parse initial date from URL or default to today
	const defaultDate = useMemo(() => {
		if (initialDate) {
			try {
				return parseISO(initialDate);
			} catch {
				return new Date();
			}
		}
		return new Date();
	}, [initialDate]);

	const [currentDate, setCurrentDate] = useState<Date>(defaultDate);
	const [currentView, setCurrentView] = useState<View>(initialView);

	// Sync view with URL when initialView changes
	useEffect(() => {
		if (initialView !== currentView) {
			setCurrentView(initialView);
		}
	}, [initialView, currentView]);

	// Update event mutation (for drag & drop)
	const updateEventMutation = useMutation(
		trpc.event.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Événement mis à jour");
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error
						? error.message
						: "Erreur lors de la mise à jour";
				toast.error(message);
				// Refetch to revert optimistic update
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
			},
		}),
	);

	const calendarEvents = useMemo(
		() =>
			events.map((event) => {
				// Use event color if set, otherwise use calendar color
				const effectiveColor = event.color || calendarColor;
				return {
					id: event.id,
					title: event.title,
					start: new Date(event.startDate),
					end: new Date(event.endDate),
					resource: event,
					...(effectiveColor && {
						style: {
							backgroundColor: effectiveColor,
							borderColor: effectiveColor,
						},
					}),
				};
			}),
		[events, calendarColor],
	);

	const handleSelectEvent = useCallback(
		(event: RBCEvent) => {
			navigate({
				to: `/calendars/${calendarId}/events/${event.id}`,
			});
		},
		[calendarId, navigate],
	);

	const handleSelectSlot = useCallback(
		(slotInfo: { start: Date; end: Date; action: string }) => {
			// For single click, open quick create
			// For double click or drag selection, still open quick create but with full range
			quickCreate.open(slotInfo.start, slotInfo.end);
		},
		[quickCreate],
	);

	const handleNavigate = useCallback(
		(newDate: Date) => {
			setCurrentDate(newDate);
			// Update URL with the new date (use first of month for cleaner URLs)
			const dateStr = format(startOfMonth(newDate), "yyyy-MM-dd");
			onDateChange?.(dateStr);
		},
		[onDateChange],
	);

	const handleViewChange = useCallback(
		(view: View) => {
			setCurrentView(view);
			onViewChange?.(view);
		},
		[onViewChange],
	);

	// Handle event drop (drag & drop move)
	const handleEventDrop = useCallback(
		({
			event,
			start,
			end,
		}: {
			event: RBCEvent;
			start: Date | string;
			end: Date | string;
		}) => {
			updateEventMutation.mutate({
				id: event.id,
				startDate: new Date(start).toISOString(),
				endDate: new Date(end).toISOString(),
			});
		},
		[updateEventMutation],
	);

	// Handle event resize
	const handleEventResize = useCallback(
		({
			event,
			start,
			end,
		}: {
			event: RBCEvent;
			start: Date | string;
			end: Date | string;
		}) => {
			updateEventMutation.mutate({
				id: event.id,
				startDate: new Date(start).toISOString(),
				endDate: new Date(end).toISOString(),
			});
		},
		[updateEventMutation],
	);

	// Navigate to full form with data from quick create
	const handleOpenFullForm = useCallback(
		(data: { title: string; start: Date; end: Date }) => {
			const start = format(data.start, "yyyy-MM-dd'T'HH:mm");
			const end = format(data.end, "yyyy-MM-dd'T'HH:mm");
			navigate({
				to: `/calendars/${calendarId}/events/new`,
				search: { start, end },
			});
		},
		[calendarId, navigate],
	);

	// Custom event wrapper to add hover card
	const components = useMemo(
		() => ({
			event: (props: EventProps<RBCEvent>) => (
				<EventWithHover {...props} calendarId={calendarId} />
			),
		}),
		[calendarId],
	);

	return (
		<div
			className={cn(
				"relative h-[600px]",
				updateEventMutation.isPending && "opacity-70",
			)}
		>
			<DnDCalendar
				localizer={localizer}
				events={calendarEvents}
				startAccessor="start"
				endAccessor="end"
				date={currentDate}
				view={currentView}
				onNavigate={handleNavigate}
				onView={handleViewChange}
				onSelectEvent={handleSelectEvent}
				onSelectSlot={handleSelectSlot}
				onEventDrop={handleEventDrop}
				onEventResize={handleEventResize}
				selectable
				resizable
				draggableAccessor={() => true}
				resizableAccessor={() => true}
				views={["month", "week", "day"]}
				popup
				components={components}
				messages={{
					next: "Suivant",
					previous: "Précédent",
					today: "Aujourd'hui",
					month: "Mois",
					week: "Semaine",
					day: "Jour",
					showMore: (count) => `+${count} autres`,
					noEventsInRange: "Aucun événement sur cette période",
				}}
				formats={{
					monthHeaderFormat: (date: Date) =>
						format(date, "MMMM yyyy", { locale: fr }),
					weekdayFormat: (date: Date) =>
						format(date, "EEEE", { locale: fr }).slice(0, 3),
					dayFormat: (date: Date) => format(date, "d", { locale: fr }),
					dayHeaderFormat: (date: Date) =>
						format(date, "EEEE d MMMM", { locale: fr }),
					dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
						`${format(start, "d MMM", { locale: fr })} - ${format(end, "d MMM yyyy", { locale: fr })}`,
				}}
			/>

			{/* Quick Create Popover */}
			<QuickCreateEvent
				calendarId={calendarId}
				startDate={quickCreate.startDate}
				endDate={quickCreate.endDate}
				isOpen={quickCreate.isOpen}
				onClose={quickCreate.close}
				onOpenFullForm={handleOpenFullForm}
			/>
		</div>
	);
}

/**
 * @deprecated Use CalendarView instead
 * Backwards-compatible alias for CalendarView
 */
export const CalendarMonthView = CalendarView;
