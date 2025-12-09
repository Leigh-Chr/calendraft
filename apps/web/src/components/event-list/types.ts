/**
 * Types for Event List components
 */

export interface EventItem {
	id: string;
	title: string;
	startDate: Date | string;
	endDate: Date | string;
	description?: string | null;
	location?: string | null;
	status?: string | null;
	priority?: number | null;
	categories?: Array<{ category: string }> | string | null;
	url?: string | null;
	class?: string | null;
	rrule?: string | null;
	color?: string | null;
	attendees?: Array<{ email: string; name?: string | null }>;
	alarms?: Array<{ action: string; trigger: string }>;
	// Additional fields
	resources?: Array<{ resource: string }> | string | null;
	organizerName?: string | null;
	organizerEmail?: string | null;
	contact?: string | null;
	transp?: string | null;
	comment?: string | null;
}

export interface FilterState {
	sortBy: "date" | "name" | "duration";
	sortDirection: "asc" | "desc"; // Only used when sortBy is "date"
	keyword: string;
	dateFrom: Date | undefined;
	dateTo: Date | undefined;
	dateFilter: "all" | "today" | "week" | "month";
	cursor: string | undefined;
}

export const INITIAL_FILTER_STATE: FilterState = {
	sortBy: "date",
	sortDirection: "asc",
	keyword: "",
	dateFrom: undefined,
	dateTo: undefined,
	dateFilter: "all",
	cursor: undefined,
};
