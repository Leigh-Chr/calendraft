/**
 * Event info row components - Simple display components for event details
 * Updated with contextual date formatting and visual hierarchy
 */

import {
	Bell,
	Calendar as CalendarIcon,
	Clock,
	Eye,
	Link as LinkIcon,
	MapPin,
	MessageSquare,
	Package,
	Phone,
	Tag,
	User,
	Users,
} from "lucide-react";
// React Compiler will automatically memoize these components
import { formatEventDateTime, getEventTimeStatus } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

// ----- Row Components -----

/**
 * Enhanced DateTime display with contextual formatting
 * Shows "Today" / "Tomorrow" etc. with time range
 */
export function DateTimeRow({
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
				<CalendarIcon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
				<span className="font-semibold text-foreground">{date}</span>
			</div>
			<div className="flex items-center gap-2">
				<Clock className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
				<span className="text-muted-foreground">{time}</span>
			</div>
			{timeStatus && (
				<TimeStatusBadge status={timeStatus.status} label={timeStatus.label} />
			)}
		</div>
	);
}

/**
 * Time status badge component
 */
function TimeStatusBadge({
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
}

export function LocationRow({ location }: { location: string }) {
	return (
		<div className="flex items-center gap-2">
			<MapPin className="h-4 w-4" />
			<span>{location}</span>
		</div>
	);
}

export function CategoriesRow({ categories }: { categories: string }) {
	return (
		<div className="flex items-center gap-2">
			<Tag className="h-4 w-4" />
			<span>{categories}</span>
		</div>
	);
}

export function UrlRow({ url }: { url: string }) {
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
}

export function AttendeesRow({ count }: { count: number }) {
	return (
		<div className="flex items-center gap-2">
			<Users className="h-4 w-4" />
			<span>
				{count} participant{count > 1 ? "s" : ""}
			</span>
		</div>
	);
}

export function AlarmsRow({ count }: { count: number }) {
	return (
		<div className="flex items-center gap-2">
			<Bell className="h-4 w-4" />
			<span>
				{count} alert{count > 1 ? "s" : ""}
			</span>
		</div>
	);
}

export function DescriptionRow({ description }: { description: string }) {
	return <p className="mt-2 line-clamp-2">{description}</p>;
}

export function OrganizerRow({
	organizerName,
	organizerEmail,
}: {
	organizerName?: string | null;
	organizerEmail?: string | null;
}) {
	if (!organizerName && !organizerEmail) return null;

	const displayText = organizerName
		? organizerEmail
			? `${organizerName} (${organizerEmail})`
			: organizerName
		: organizerEmail || "";

	return (
		<div className="flex items-center gap-2">
			<User className="h-4 w-4" />
			<span>
				<span className="text-muted-foreground">Organisé par: </span>
				{organizerEmail ? (
					<a
						href={`mailto:${organizerEmail}`}
						className="text-primary hover:underline"
					>
						{displayText}
					</a>
				) : (
					<span>{displayText}</span>
				)}
			</span>
		</div>
	);
}

export function ContactRow({ contact }: { contact: string }) {
	return (
		<div className="flex items-center gap-2">
			<Phone className="h-4 w-4" />
			<span>
				<span className="text-muted-foreground">Contact: </span>
				{contact}
			</span>
		</div>
	);
}

export function ResourcesRow({ resources }: { resources: string }) {
	return (
		<div className="flex items-center gap-2">
			<Package className="h-4 w-4" />
			<span>
				<span className="text-muted-foreground">Ressources: </span>
				{resources}
			</span>
		</div>
	);
}

export function TransparencyRow({ transp }: { transp: string }) {
	const isTransparent = transp === "TRANSPARENT";
	return (
		<div className="flex items-center gap-2">
			<Eye className="h-4 w-4" />
			<span className="text-muted-foreground text-xs">
				{isTransparent ? "Disponible" : "Occupé"}
			</span>
		</div>
	);
}

export function CommentRow({ comment }: { comment: string }) {
	return (
		<div className="flex items-start gap-2">
			<MessageSquare className="mt-0.5 h-4 w-4" />
			<span className="text-muted-foreground italic">{comment}</span>
		</div>
	);
}
