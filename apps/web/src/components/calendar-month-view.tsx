import { useNavigate } from "@tanstack/react-router";
import { format, parseISO, startOfMonth } from "date-fns";
import moment from "moment";
import { useCallback, useMemo, useState } from "react";
import { Calendar, momentLocalizer, type View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar-month-view.css";

const localizer = momentLocalizer(moment);

interface CalendarMonthViewProps {
	calendarId: string;
	events: Array<{
		id: string;
		title: string;
		startDate: Date;
		endDate: Date;
		description?: string | null;
		location?: string | null;
		color?: string | null;
	}>;
	/** Calendar color (used as default for events without their own color) */
	calendarColor?: string | null;
	/** Initial date to display (ISO date string YYYY-MM-DD) */
	initialDate?: string;
	/** Callback when the viewed date changes */
	onDateChange?: (date: string) => void;
}

export function CalendarMonthView({
	calendarId,
	events,
	calendarColor,
	initialDate,
	onDateChange,
}: CalendarMonthViewProps) {
	const navigate = useNavigate();

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
	const [currentView, setCurrentView] = useState<View>("month");

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
		(event: {
			id: string;
			title: string;
			start: Date;
			end: Date;
			resource: CalendarMonthViewProps["events"][number];
		}) => {
			navigate({
				to: `/calendars/${calendarId}/events/${event.id}`,
			});
		},
		[calendarId, navigate],
	);

	const handleSelectSlot = useCallback(
		(slotInfo: { start: Date; end: Date }) => {
			// Navigate to create event with pre-filled dates
			const start = format(slotInfo.start, "yyyy-MM-dd'T'HH:mm");
			const end = format(slotInfo.end, "yyyy-MM-dd'T'HH:mm");
			navigate({
				to: `/calendars/${calendarId}/events/new`,
				search: { start, end },
			});
		},
		[calendarId, navigate],
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

	const handleViewChange = useCallback((view: View) => {
		setCurrentView(view);
	}, []);

	return (
		<div className="h-[600px]">
			<Calendar
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
				selectable
				views={["month", "week", "day"]}
				messages={{
					next: "Suivant",
					previous: "Précédent",
					today: "Aujourd'hui",
					month: "Mois",
					week: "Semaine",
					day: "Jour",
				}}
			/>
		</div>
	);
}
