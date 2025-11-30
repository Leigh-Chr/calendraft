/**
 * Event info row components - Simple display components for event details
 */

import {
	Bell,
	Calendar as CalendarIcon,
	Link as LinkIcon,
	MapPin,
	Tag,
	Users,
} from "lucide-react";
import React from "react";
import {
	formatDateTime,
	formatDuration,
	normalizeDate,
} from "@/lib/date-utils";

// ----- Row Components -----

export const DateTimeRow = React.memo(function DateTimeRow({
	startDate,
	endDate,
}: {
	startDate: Date | string;
	endDate: Date | string;
}) {
	return (
		<div className="flex items-center gap-2">
			<CalendarIcon className="h-4 w-4" />
			<span>
				{formatDateTime(normalizeDate(startDate))} -{" "}
				{formatDateTime(normalizeDate(endDate))}
			</span>
		</div>
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

export const DurationRow = React.memo(function DurationRow({
	startDate,
	endDate,
}: {
	startDate: Date | string;
	endDate: Date | string;
}) {
	return (
		<div className="text-xs">Durée: {formatDuration(startDate, endDate)}</div>
	);
});

export const DescriptionRow = React.memo(function DescriptionRow({
	description,
}: {
	description: string;
}) {
	return <p className="mt-2 line-clamp-2">{description}</p>;
});
