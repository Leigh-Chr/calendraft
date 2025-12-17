import { useIsMobile } from "@calendraft/react-utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	format,
	getDay,
	parse,
	parseISO,
	startOfMonth,
	startOfWeek,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { useEffect, useState } from "react";
import {
	Calendar,
	dateFnsLocalizer,
	type EventProps,
	type View,
} from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

// Configure date-fns localizer for react-big-calendar
const locales = {
	"en-US": enUS,
};

const localizer = dateFnsLocalizer({
	format,
	parse,
	startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
	getDay,
	locales,
});

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

// Custom event component with hover preview (desktop) or dialog (mobile)
function EventWithHover({
	event,
	calendarId,
}: EventProps<RBCEvent> & { calendarId: string }) {
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const [dialogOpen, setDialogOpen] = useState(false);

	// React Compiler will automatically memoize this callback
	const handleClick = (e: React.MouseEvent): void => {
		e.stopPropagation();
		if (isMobile) {
			setDialogOpen(true);
		} else {
			navigate({
				to: `/calendars/${calendarId}/events/${event.resource.id}`,
			});
		}
	};

	const handleEdit = () => {
		setDialogOpen(false);
		navigate({
			to: `/calendars/${calendarId}/events/${event.resource.id}`,
		});
	};

	const eventContent = (
		<div className="space-y-3">
			{/* Event title */}
			<div>
				<h4 className="text-heading-4">{event.title}</h4>
				<p className="mt-1 text-muted-foreground text-sm">
					{format(event.start, "EEEE d MMMM yyyy", { locale: enUS })}
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
				Click to edit • Drag to move
			</p>
		</div>
	);

	if (isMobile) {
		return (
			<>
				<button
					type="button"
					className="rbc-event-content w-full cursor-pointer truncate border-none bg-transparent p-0 text-left text-inherit"
					onClick={handleClick}
				>
					{event.title}
				</button>
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>{event.title}</DialogTitle>
							<DialogDescription>
								{format(event.start, "EEEE d MMMM yyyy", { locale: enUS })}
								{" • "}
								{format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
							</DialogDescription>
						</DialogHeader>
						{eventContent}
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setDialogOpen(false)}
							>
								Close
							</Button>
							<Button type="button" onClick={handleEdit}>
								Edit
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</>
		);
	}

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
				className="w-[calc(100vw-2rem)] max-w-sm p-4 sm:w-80"
				side="right"
				align="start"
				sideOffset={8}
			>
				{eventContent}
			</HoverCardContent>
		</HoverCard>
	);
}

/**
 * CalendarView - Calendar visualization component with month, week, and day views
 * Supports drag & drop, event resizing, and quick create
 * React Compiler will automatically memoize this component
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
	const isMobile = useIsMobile();

	// Parse initial date from URL or default to today
	// React Compiler will automatically memoize this computation
	const defaultDate = ((): Date => {
		if (initialDate) {
			try {
				return parseISO(initialDate);
			} catch {
				return new Date();
			}
		}
		return new Date();
	})();

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
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard.all });
				toast.success("Event updated");
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during update";
				toast.error(message);
				// Refetch to revert optimistic update
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
			},
		}),
	);

	// React Compiler will automatically memoize this computation
	const calendarEvents = events.map((event) => {
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
	});

	// React Compiler will automatically memoize these callbacks
	const handleSelectEvent = (event: RBCEvent): void => {
		navigate({
			to: `/calendars/${calendarId}/events/${event.id}`,
		});
	};

	const handleSelectSlot = (slotInfo: {
		start: Date;
		end: Date;
		action: string;
	}): void => {
		// For single click, open quick create
		// For double click or drag selection, still open quick create but with full range
		quickCreate.open(slotInfo.start, slotInfo.end);
	};

	const handleNavigate = (newDate: Date): void => {
		setCurrentDate(newDate);
		// Update URL with the new date (use first of month for cleaner URLs)
		const dateStr = format(startOfMonth(newDate), "yyyy-MM-dd");
		onDateChange?.(dateStr);
	};

	const handleViewChange = (view: View): void => {
		setCurrentView(view);
		onViewChange?.(view);
	};

	// Handle event drop (drag & drop move)
	const handleEventDrop = ({
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
	};

	// Handle event resize
	const handleEventResize = ({
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
	};

	// Navigate to full form with data from quick create
	const handleOpenFullForm = (data: {
		title: string;
		start: Date;
		end: Date;
	}) => {
		const start = format(data.start, "yyyy-MM-dd'T'HH:mm");
		const end = format(data.end, "yyyy-MM-dd'T'HH:mm");
		navigate({
			to: `/calendars/${calendarId}/events/new`,
			search: { start, end },
		});
	};

	// Custom event wrapper to add hover card
	// React Compiler will automatically memoize this computation
	const components = {
		event: (props: EventProps<RBCEvent>) => (
			<EventWithHover {...props} calendarId={calendarId} />
		),
	};

	return (
		<div
			className={cn(
				"relative",
				isMobile ? "h-[calc(100vh-20rem)] min-h-[25rem]" : "h-[37.5rem]",
				updateEventMutation.isPending && "opacity-70",
			)}
		>
			<DnDCalendar
				localizer={localizer}
				culture="en-US"
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
					next: "Next",
					previous: "Previous",
					today: "Today",
					month: "Month",
					week: "Week",
					day: "Day",
					showMore: (count) => `+${count} more`,
					noEventsInRange: "No events in this period",
				}}
				formats={{
					monthHeaderFormat: (date: Date) =>
						format(date, "MMMM yyyy", { locale: enUS }),
					weekdayFormat: (date: Date) =>
						format(date, "EEEE", { locale: enUS }).slice(0, 3),
					dayFormat: (date: Date) => format(date, "d", { locale: enUS }),
					dayHeaderFormat: (date: Date) =>
						format(date, "EEEE, MMMM d", { locale: enUS }),
					dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
						`${format(start, "MMM d", { locale: enUS })} - ${format(end, "MMM d, yyyy", { locale: enUS })}`,
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
