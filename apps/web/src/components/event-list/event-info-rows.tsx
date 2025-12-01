/**
 * Event info row components - Simple display components for event details
 * Updated with contextual date formatting and visual hierarchy
 */

import {
	Bell,
	Calendar as CalendarIcon,
	Clock,
	Link as LinkIcon,
	MapPin,
	Tag,
	Users,
} from "lucide-react";
import React from "react";
import {
	formatDuration,
	formatEventDateTime,
	getEventTimeStatus,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// ----- Row Components -----

/**
 * Enhanced DateTime display with contextual formatting
 * Shows "Aujourd'hui" / "Demain" etc. with time range
 */
export const DateTimeRow = React.memo(function DateTimeRow({
	startDate,
	endDate,
	compact = false,
}: {
	startDate: Date | string;
	endDate: Date | string;
	compact?: boolean;
}) {
	const { date, time, isPastEvent } = formatEventDateTime(startDate, endDate);
	const timeStatus = getEventTimeStatus(startDate, endDate);

	if (compact) {
		return (
			<div
				className={cn(
					"flex items-center gap-2 text-sm",
					isPastEvent && "text-muted-foreground/60",
				)}
			>
				<Clock className="h-3.5 w-3.5 shrink-0" />
				<span className="font-medium">{date}</span>
				<span className="text-muted-foreground">·</span>
				<span className="text-muted-foreground">{time}</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-x-3 gap-y-1",
				isPastEvent && "opacity-60",
			)}
		>
			<div className="flex items-center gap-2">
				<CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="font-medium text-foreground">{date}</span>
			</div>
			<div className="flex items-center gap-2">
				<Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
				<span className="text-muted-foreground">{time}</span>
			</div>
			{timeStatus && (
				<TimeStatusBadge status={timeStatus.status} label={timeStatus.label} />
			)}
		</div>
	);
});

/**
 * Time status badge component
 */
const TimeStatusBadge = React.memo(function TimeStatusBadge({
	status,
	label,
}: {
	status: "past" | "ongoing" | "upcoming" | "soon";
	label: string;
}) {
	const styles = {
		ongoing:
			"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
		soon: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
		upcoming:
			"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
		past: "bg-muted text-muted-foreground",
	};

	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs",
				styles[status],
			)}
		>
			{status === "ongoing" && (
				<span className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
			)}
			{label}
		</span>
	);
});

export const LocationRow = React.memo(function LocationRow({
	location,
}: {
	location: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<MapPin className="h-4 w-4" />
			<span>{location}</span>
		</div>
	);
});

export const CategoriesRow = React.memo(function CategoriesRow({
	categories,
}: {
	categories: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<Tag className="h-4 w-4" />
			<span>{categories}</span>
		</div>
	);
});

export const UrlRow = React.memo(function UrlRow({ url }: { url: string }) {
	return (
		<div className="flex items-center gap-2">
			<LinkIcon className="h-4 w-4" />
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary hover:underline"
			>
				{url}
			</a>
		</div>
	);
});

export const AttendeesRow = React.memo(function AttendeesRow({
	count,
}: {
	count: number;
}) {
	return (
		<div className="flex items-center gap-2">
			<Users className="h-4 w-4" />
			<span>
				{count} participant{count > 1 ? "s" : ""}
			</span>
		</div>
	);
});

export const AlarmsRow = React.memo(function AlarmsRow({
	count,
}: {
	count: number;
}) {
	return (
		<div className="flex items-center gap-2">
			<Bell className="h-4 w-4" />
			<span>
				{count} alerte{count > 1 ? "s" : ""}
			</span>
		</div>
	);
});

/**
 * Duration display - only shown when relevant (long events, multi-day)
 * Now more subtle and integrated
 */
export const DurationRow = React.memo(function DurationRow({
	startDate,
	endDate,
	showIcon = false,
}: {
	startDate: Date | string;
	endDate: Date | string;
	showIcon?: boolean;
}) {
	const duration = formatDuration(startDate, endDate);

	return (
		<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
			{showIcon && <Clock className="h-3 w-3" />}
			<span>{duration}</span>
		</div>
	);
});

export const DescriptionRow = React.memo(function DescriptionRow({
	description,
}: {
	description: string;
}) {
	return <p className="mt-2 line-clamp-2">{description}</p>;
});
