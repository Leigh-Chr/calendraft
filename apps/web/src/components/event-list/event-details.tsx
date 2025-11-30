/**
 * Event details display component
 * Uses a data-driven approach to reduce cyclomatic complexity
 */

import React, { useMemo } from "react";
import {
	AlarmsRow,
	AttendeesRow,
	CategoriesRow,
	DateTimeRow,
	DescriptionRow,
	DurationRow,
	LocationRow,
	UrlRow,
} from "./event-info-rows";
import type { EventItem } from "./types";

// ----- Types -----

interface RowConfig {
	key: string;
	value: unknown;
	render: () => React.ReactNode;
}

// ----- Helper Functions -----

function formatCategories(
	categories: Array<{ category: string }> | string | null | undefined,
): string {
	if (!categories) return "";
	if (Array.isArray(categories)) {
		return categories
			.map((c) => (typeof c === "string" ? c : c.category))
			.join(", ");
	}
	return typeof categories === "string" ? categories : "";
}

function buildRowConfigs(event: EventItem): RowConfig[] {
	const categoriesStr = formatCategories(event.categories);

	return [
		{
			key: "loc",
			value: event.location,
			render: () => <LocationRow location={event.location as string} />,
		},
		{
			key: "cat",
			value: categoriesStr,
			render: () => <CategoriesRow categories={categoriesStr} />,
		},
		{
			key: "url",
			value: event.url,
			render: () => <UrlRow url={event.url as string} />,
		},
		{
			key: "att",
			value: event.attendees?.length,
			render: () => <AttendeesRow count={event.attendees?.length || 0} />,
		},
		{
			key: "alm",
			value: event.alarms?.length,
			render: () => <AlarmsRow count={event.alarms?.length || 0} />,
		},
		{
			key: "desc",
			value: event.description,
			render: () => (
				<DescriptionRow description={event.description as string} />
			),
		},
	];
}

// ----- Component -----

export const EventDetails = React.memo(function EventDetails({
	event,
}: {
	event: EventItem;
}) {
	const optionalRows = useMemo(() => {
		return buildRowConfigs(event)
			.filter((row) => Boolean(row.value))
			.map((row) => (
				<React.Fragment key={row.key}>{row.render()}</React.Fragment>
			));
	}, [event]);

	return (
		<div className="space-y-1 text-muted-foreground text-sm">
			<DateTimeRow startDate={event.startDate} endDate={event.endDate} />
			{optionalRows}
			<DurationRow startDate={event.startDate} endDate={event.endDate} />
		</div>
	);
});
