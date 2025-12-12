/**
 * Calendar Card Component
 * Displays a single calendar with actions and upcoming events preview
 */

import { format, formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Edit,
	ExternalLink,
	Globe,
	MoreHorizontal,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CalendarGroupBadges } from "./group-badges";

interface CalendarCardProps {
	calendar: {
		id: string;
		name: string;
		eventCount: number;
		color?: string | null;
		sourceUrl?: string | null;
		lastSyncedAt?: string | Date | null;
		events?: Array<{
			id: string;
			title: string;
			startDate: string | Date;
		}>;
	};
	onOpen: () => void;
	onEdit: () => void;
	onDelete: () => void;
	isDeleting: boolean;
	isUpdating: boolean;
	/** Selection mode props */
	selectionMode?: boolean;
	isSelected?: boolean;
	onToggleSelect?: (id: string) => void;
}

/**
 * Format date for calendar card preview
 * Shows contextual labels: "Today", "Tomorrow", or date
 */
function formatCardDate(date: string | Date): string {
	const d = new Date(date);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

	if (eventDate.getTime() === today.getTime()) {
		return "Today";
	}
	if (eventDate.getTime() === tomorrow.getTime()) {
		return "Tomorrow";
	}
	return format(d, "MMM d", { locale: enUS });
}

export function CalendarCard({
	calendar,
	onOpen,
	onEdit,
	onDelete,
	isDeleting,
	isUpdating,
	selectionMode = false,
	isSelected = false,
	onToggleSelect,
}: CalendarCardProps) {
	// React Compiler will automatically memoize these callbacks
	const handleNavigate = () => {
		if (selectionMode) {
			onToggleSelect?.(calendar.id);
		} else {
			onOpen();
		}
	};

	const handleCheckboxChange = (_checked: boolean) => {
		onToggleSelect?.(calendar.id);
	};
	// Get upcoming events (up to 3)
	const now = new Date();
	const upcomingEvents =
		calendar.events?.filter((e) => new Date(e.startDate) >= now).slice(0, 3) ||
		[];

	// Get the next event for highlight
	const nextEvent = upcomingEvents[0];
	const isNextEventToday =
		nextEvent &&
		new Date(nextEvent.startDate).toDateString() === now.toDateString();

	return (
		<Card
			className={cn(
				"group relative cursor-pointer overflow-hidden transition-all duration-200",
				"hover:border-primary/30 hover:shadow-lg",
				selectionMode && "cursor-pointer",
				isSelected && "bg-primary/5 ring-2 ring-primary",
			)}
			onClick={selectionMode ? handleNavigate : onOpen}
		>
			{/* Color accent - left border instead of top for more subtle look */}
			<div
				className="absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-1.5"
				style={{ backgroundColor: calendar.color || "#D4A017" }}
			/>

			<CardHeader className="pb-2 pl-5">
				<div className="flex items-start justify-between">
					{/* Selection checkbox */}
					{selectionMode && (
						<div className="mr-3 flex items-center pt-0.5">
							<Checkbox
								checked={isSelected}
								onCheckedChange={handleCheckboxChange}
								onClick={(e) => e.stopPropagation()}
								aria-label={`Select ${calendar.name}`}
							/>
						</div>
					)}
					<div className="min-w-0 flex-1 pr-8">
						<CardTitle className="line-clamp-1 text-card-title">
							{calendar.name}
						</CardTitle>
						<CalendarGroupBadges calendarId={calendar.id} />
						<CardDescription className="mt-0.5 flex flex-wrap items-center gap-2">
							<span>
								{calendar.eventCount} event
								{calendar.eventCount !== 1 ? "s" : ""}
							</span>
							{calendar.sourceUrl && (
								<span
									className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 font-medium text-blue-600 text-xs dark:text-blue-400"
									title={
										calendar.lastSyncedAt
											? `Subscribed to ${calendar.sourceUrl}. Last synced ${formatDistanceToNow(new Date(calendar.lastSyncedAt), { addSuffix: true })}`
											: `Subscribed to ${calendar.sourceUrl}`
									}
								>
									<Globe className="h-3 w-3" />
									Subscribed
								</span>
							)}
							{isNextEventToday && (
								<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs">
									<span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
									Today
								</span>
							)}
						</CardDescription>
					</div>

					{/* Actions Menu - hide in selection mode */}
					{!selectionMode && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
								<Button
									variant="ghost"
									size="icon"
									className="absolute top-2 right-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onOpen();
									}}
								>
									<ExternalLink className="mr-2 h-4 w-4" />
									Open
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onEdit();
									}}
									disabled={isUpdating}
								>
									<Edit className="mr-2 h-4 w-4" />
									Edit
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={(e) => {
										e.stopPropagation();
										onDelete();
									}}
									disabled={isDeleting}
									className="text-destructive focus:text-destructive"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</CardHeader>

			<CardContent className="pt-0 pl-5">
				{/* Upcoming events preview - improved layout */}
				{upcomingEvents.length > 0 ? (
					<div className="space-y-1">
						{upcomingEvents.map((event, index) => {
							const isToday =
								new Date(event.startDate).toDateString() === now.toDateString();
							return (
								<div
									key={event.id}
									className={cn(
										"flex items-center gap-2 text-xs",
										index === 0 ? "text-foreground" : "text-muted-foreground",
									)}
								>
									<span
										className={cn(
											"w-10 shrink-0 text-right font-medium",
											isToday && "text-primary",
										)}
									>
										{formatCardDate(event.startDate)}
									</span>
									<span
										className="h-1 w-1 shrink-0 rounded-full"
										style={{ backgroundColor: calendar.color || "#D4A017" }}
									/>
									<span className="truncate">{event.title}</span>
								</div>
							);
						})}
						{calendar.eventCount > 3 && (
							<p className="mt-1 text-muted-foreground/60 text-xs">
								+{calendar.eventCount - 3} others
							</p>
						)}
					</div>
				) : (
					<p className="py-2 text-center text-muted-foreground/50 text-xs italic">
						No upcoming events
					</p>
				)}
			</CardContent>
		</Card>
	);
}
