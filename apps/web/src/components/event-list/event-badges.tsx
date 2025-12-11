/**
 * Badge components for event display
 * Refined with better visual hierarchy and subtle indicators
 */

import { AlertCircle, Lock, Repeat } from "lucide-react";
// React Compiler will automatically memoize these components
import { cn } from "@/lib/utils";
import type { EventItem } from "./types";

// ----- Constants -----

const STATUS_CONFIG = {
	CONFIRMED: {
		dot: "bg-green-500",
		label: "Confirmed",
		show: false, // Don't show badge for confirmed (default state)
	},
	TENTATIVE: {
		dot: "bg-amber-500",
		label: "Tentative",
		show: true,
	},
	CANCELLED: {
		dot: "bg-red-500",
		label: "Canceled",
		show: true,
		strikethrough: true,
	},
} as const;

// ----- Components -----

/**
 * Status indicator - now a subtle dot instead of loud badge
 */
export function StatusBadge({ status }: { status: string | null | undefined }) {
	if (!status) return null;
	const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
	if (!config || !config.show) return null;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
				status === "CANCELLED" &&
					"bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
				status === "TENTATIVE" &&
					"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
			)}
		>
			<span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
			{config.label}
		</span>
	);
}

/**
 * Privacy indicator - icon-based for compact display
 */
export function ClassBadge({
	classValue,
}: {
	classValue: string | null | undefined;
}) {
	// Only show for non-public events
	if (!classValue || classValue === "PUBLIC") return null;

	return (
		<span
			className="inline-flex items-center gap-1 text-muted-foreground text-xs"
			title={classValue === "PRIVATE" ? "Private" : "Confidential"}
		>
			<Lock className="h-3 w-3" />
		</span>
	);
}

/**
 * Priority indicator - only show high priority (1-4)
 */
export function PriorityBadge({
	priority,
}: {
	priority: number | null | undefined;
}) {
	if (priority === null || priority === undefined || priority <= 0) return null;

	// Only show for high priority (1-4)
	if (priority > 4) return null;

	return (
		<span
			className="inline-flex items-center gap-1 text-amber-600 text-xs dark:text-amber-400"
			title={`Priorité ${priority}`}
		>
			<AlertCircle className="h-3.5 w-3.5" />
		</span>
	);
}

/**
 * Recurrence indicator - subtle icon
 */
export function RecurrenceBadge({
	rrule,
}: {
	rrule: string | null | undefined;
}) {
	if (!rrule) return null;
	return (
		<span
			className="inline-flex items-center text-muted-foreground"
			title="Recurring event"
		>
			<Repeat className="h-3.5 w-3.5" />
		</span>
	);
}

/**
 * Color indicator dot
 */
export function ColorDot({
	color,
	size = "md",
}: {
	color: string | null | undefined;
	size?: "sm" | "md" | "lg";
}) {
	if (!color) return null;

	const sizes = {
		sm: "h-2 w-2",
		md: "h-2.5 w-2.5",
		lg: "h-3 w-3",
	};

	return (
		<span
			className={cn("shrink-0 rounded-full", sizes[size])}
			style={{ backgroundColor: color }}
		/>
	);
}

/**
 * Event header with title and inline indicators
 * Improved visual hierarchy: title prominent, indicators subtle
 */
export function EventBadges({
	event,
	showColor = false,
}: {
	event: EventItem;
	showColor?: boolean;
}) {
	const isCancelled = event.status === "CANCELLED";
	const hasIndicators =
		event.rrule || event.priority || (event.class && event.class !== "PUBLIC");

	return (
		<div className="mb-3 flex items-start gap-2">
			{showColor && <ColorDot color={event.color} size="md" />}
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<h3
						className={cn(
							"text-heading-4",
							isCancelled && "text-muted-foreground line-through",
						)}
					>
						{event.title}
					</h3>
					{/* Inline subtle indicators */}
					{hasIndicators && (
						<div className="flex items-center gap-1.5">
							<RecurrenceBadge rrule={event.rrule} />
							<PriorityBadge priority={event.priority} />
							<ClassBadge classValue={event.class} />
						</div>
					)}
				</div>
				{/* Status badge on its own line if cancelled/tentative */}
				<StatusBadge status={event.status} />
			</div>
		</div>
	);
}
