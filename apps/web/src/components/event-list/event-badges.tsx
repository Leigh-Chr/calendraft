/**
 * Badge components for event display
 */

import React from "react";
import type { EventItem } from "./types";

// ----- Constants -----

const STATUS_CONFIG = {
	CONFIRMED: {
		className:
			"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
		label: "Confirmé",
	},
	TENTATIVE: {
		className:
			"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
		label: "Tentatif",
	},
	CANCELLED: {
		className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
		label: "Annulé",
	},
} as const;

const CLASS_CONFIG: Record<string, string> = {
	PUBLIC: "Public",
	PRIVATE: "Privé",
	CONFIDENTIAL: "Confidentiel",
};

// ----- Components -----

export const StatusBadge = React.memo(function StatusBadge({
	status,
}: {
	status: string | null | undefined;
}) {
	if (!status) return null;
	const config =
		STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
		STATUS_CONFIG.CANCELLED;
	return (
		<span
			className={`rounded px-2 py-0.5 font-medium text-xs ${config.className}`}
		>
			{config.label}
		</span>
	);
});

export const ClassBadge = React.memo(function ClassBadge({
	classValue,
}: {
	classValue: string | null | undefined;
}) {
	if (!classValue) return null;
	const label = CLASS_CONFIG[classValue] || "Confidentiel";
	return (
		<span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-200">
			{label}
		</span>
	);
});

export const PriorityBadge = React.memo(function PriorityBadge({
	priority,
}: {
	priority: number | null | undefined;
}) {
	if (priority === null || priority === undefined || priority <= 0) return null;
	return (
		<span className="rounded bg-orange-100 px-2 py-0.5 font-medium text-orange-800 text-xs dark:bg-orange-900 dark:text-orange-200">
			Priorité {priority}
		</span>
	);
});

export const RecurrenceBadge = React.memo(function RecurrenceBadge({
	rrule,
}: {
	rrule: string | null | undefined;
}) {
	if (!rrule) return null;
	return (
		<span className="rounded bg-purple-100 px-2 py-0.5 font-medium text-purple-800 text-xs dark:bg-purple-900 dark:text-purple-200">
			Récurrent
		</span>
	);
});

export const EventBadges = React.memo(function EventBadges({
	event,
}: {
	event: EventItem;
}) {
	return (
		<div className="mb-2 flex items-center gap-2">
			<h3 className="font-semibold">{event.title}</h3>
			<StatusBadge status={event.status} />
			<PriorityBadge priority={event.priority} />
			<ClassBadge classValue={event.class} />
			<RecurrenceBadge rrule={event.rrule} />
		</div>
	);
});
