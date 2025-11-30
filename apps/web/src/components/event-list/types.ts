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
	attendees?: Array<{ email: string; name?: string | null }>;
	alarms?: Array<{ action: string; trigger: string }>;
}

export interface FilterState {
	sortBy: "date" | "name" | "duration";
	keyword: string;
	dateFrom: Date | undefined;
	dateTo: Date | undefined;
	dateFilter: "all" | "today" | "week" | "month";
	cursor: string | undefined;
}

export const INITIAL_FILTER_STATE: FilterState = {
	sortBy: "date",
	keyword: "",
	dateFrom: undefined,
	dateTo: undefined,
	dateFilter: "all",
	cursor: undefined,
};
