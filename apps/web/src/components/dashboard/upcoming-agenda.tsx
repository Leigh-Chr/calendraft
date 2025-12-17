import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AlertTriangle, MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-states";

interface UpcomingEvent {
	id: string;
	title: string;
	startDate: string | Date;
	endDate: string | Date;
	isAllDay: boolean;
	calendarId: string;
	calendarName: string;
	calendarColor: string | null;
	location: string | null;
	hasAttendees: boolean;
	attendeeCount: number;
	isRecurring: boolean;
	status: string | null;
	priority: number | null;
	conflictsWith: string[];
}

interface DayGroup {
	date: string;
	dayLabel: string;
	events: UpcomingEvent[];
}

interface UpcomingAgendaProps {
	upcoming: DayGroup[];
}

function formatTime(date: string | Date): string {
	return format(new Date(date), "HH:mm");
}

function EventRow({ event }: { event: UpcomingEvent }) {
	const hasConflict = event.conflictsWith.length > 0;
	const isTentative = event.status === "TENTATIVE";
	const isCancelled = event.status === "CANCELLED";
	const isHighPriority = event.priority !== null && event.priority <= 3;

	return (
		<Link
			to="/calendars/$calendarId/events/$eventId"
			params={{ calendarId: event.calendarId, eventId: event.id }}
			className={cn(
				"group flex items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted/50",
				hasConflict && "border-destructive/30 bg-destructive/5",
				isCancelled && "opacity-60",
			)}
		>
			{/* Time */}
			<div className="w-20 shrink-0 pt-0.5 text-muted-foreground text-sm">
				{event.isAllDay ? (
					<span className="font-medium text-foreground">All day</span>
				) : (
					<>
						{formatTime(event.startDate)}
						<br />
						<span className="text-xs">{formatTime(event.endDate)}</span>
					</>
				)}
			</div>

			{/* Color indicator */}
			<div
				className="mt-1.5 h-3 w-1 shrink-0 rounded-full"
				style={{ backgroundColor: event.calendarColor || "#6366f1" }}
			/>

			{/* Content */}
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<p className="line-clamp-1 font-medium text-sm group-hover:text-primary">
						{event.title}
					</p>
					<div className="flex shrink-0 items-center gap-1">
						{isHighPriority && (
							<span className="text-amber-600 text-xs dark:text-amber-400">
								!
							</span>
						)}
						{event.isRecurring && (
							<RefreshCw className="h-3 w-3 text-muted-foreground" />
						)}
						{hasConflict && (
							<AlertTriangle className="h-3.5 w-3.5 text-destructive" />
						)}
					</div>
				</div>
				<div className="flex items-center gap-2">
					<p className="text-muted-foreground text-xs">{event.calendarName}</p>
					{isTentative && (
						<Badge variant="outline" className="text-xs">
							Tentative
						</Badge>
					)}
					{isCancelled && (
						<Badge variant="destructive" className="text-xs">
							Cancelled
						</Badge>
					)}
				</div>
				{event.location && (
					<div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
						<MapPin className="h-3 w-3" />
						<span className="line-clamp-1">{event.location}</span>
					</div>
				)}
			</div>
		</Link>
	);
}

function DaySection({ day }: { day: DayGroup }) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between">
				<h4 className="font-semibold text-sm">{day.dayLabel}</h4>
				<Badge variant="secondary" className="text-xs">
					{day.events.length} {day.events.length === 1 ? "event" : "events"}
				</Badge>
			</div>
			<div className="space-y-1">
				{day.events.map((event) => (
					<EventRow key={event.id} event={event} />
				))}
			</div>
		</div>
	);
}

export function UpcomingAgenda({ upcoming }: UpcomingAgendaProps) {
	if (upcoming.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Upcoming (7 days)</CardTitle>
				</CardHeader>
				<CardContent>
					<EmptyState type="free-day" />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Upcoming (7 days)</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{upcoming.map((day) => (
					<DaySection key={day.date} day={day} />
				))}
			</CardContent>
		</Card>
	);
}
