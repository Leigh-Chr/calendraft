/**
 * Event details display component
 * Uses a data-driven approach to reduce cyclomatic complexity
 * Updated with improved visual hierarchy
 */

import { useIsMobile } from "@calendraft/react-utils";
import React from "react";
import {
	AlarmsRow,
	AttendeesRow,
	CategoriesRow,
	CommentRow,
	ContactRow,
	DateTimeRow,
	DescriptionRow,
	LocationRow,
	OrganizerRow,
	ResourcesRow,
	TransparencyRow,
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

function formatResources(
	resources: Array<{ resource: string }> | string | null | undefined,
): string {
	if (!resources) return "";
	if (Array.isArray(resources)) {
		return resources
			.map((r) => (typeof r === "string" ? r : r.resource))
			.join(", ");
	}
	return typeof resources === "string" ? resources : "";
}

function buildRowConfigs(event: EventItem): RowConfig[] {
	const categoriesStr = formatCategories(event.categories);
	const resourcesStr = formatResources(event.resources);

	return [
		{
			key: "loc",
			value: event.location,
			render: () => <LocationRow location={event.location as string} />,
		},
		{
			key: "org",
			value: event.organizerName || event.organizerEmail,
			render: () => (
				<OrganizerRow
					organizerName={event.organizerName}
					organizerEmail={event.organizerEmail}
				/>
			),
		},
		{
			key: "contact",
			value: event.contact,
			render: () => <ContactRow contact={event.contact as string} />,
		},
		{
			key: "cat",
			value: categoriesStr,
			render: () => <CategoriesRow categories={categoriesStr} />,
		},
		{
			key: "res",
			value: resourcesStr,
			render: () => <ResourcesRow resources={resourcesStr} />,
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
			key: "transp",
			value: event.transp,
			render: () => <TransparencyRow transp={event.transp as string} />,
		},
		{
			key: "comment",
			value: event.comment,
			render: () => <CommentRow comment={event.comment as string} />,
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

// React Compiler will automatically memoize this component
export function EventDetails({ event }: { event: EventItem }) {
	const isMobile = useIsMobile();
	// React Compiler will automatically memoize this computation
	const { secondaryRows, descriptionRow } = (() => {
		const allRows = buildRowConfigs(event).filter((row) => Boolean(row.value));

		// Separate description from other rows
		const descRow = allRows.find((row) => row.key === "desc");
		const otherRows = allRows.filter((row) => row.key !== "desc");

		// On mobile, limit secondary rows to most important ones
		const importantKeys = ["loc", "org", "cat"];
		const filteredRows = isMobile
			? otherRows.filter((row) => importantKeys.includes(row.key))
			: otherRows;

		return {
			secondaryRows: filteredRows.map((row) => (
				<React.Fragment key={row.key}>{row.render()}</React.Fragment>
			)),
			descriptionRow: descRow ? (
				<React.Fragment key={descRow.key}>{descRow.render()}</React.Fragment>
			) : null,
		};
	})();

	return (
		<div className="space-y-3 text-sm">
			{/* Primary info: Date/Time - most important */}
			<DateTimeRow startDate={event.startDate} endDate={event.endDate} />

			{/* Secondary info: location, categories, etc. */}
			{secondaryRows.length > 0 && (
				<>
					{/* Separator between primary and secondary info */}
					<div className="border-border/40 border-t" />
					<div className="flex flex-col gap-3 text-muted-foreground md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-3">
						{secondaryRows}
					</div>
				</>
			)}

			{/* Description - separate section with spacing */}
			{descriptionRow && <div className="pt-3">{descriptionRow}</div>}
		</div>
	);
}
