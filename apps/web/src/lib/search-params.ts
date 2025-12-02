/**
 * Search params schemas for URL state management
 * Uses Zod for validation with fallback defaults
 *
 * Benefits of URL search params:
 * - Shareable URLs (users can share filtered views)
 * - Browser back/forward navigation works correctly
 * - State persists on page refresh
 * - SEO friendly (for public pages)
 *
 * Using @tanstack/zod-adapter's fallback() for graceful error handling:
 * - Invalid URL params fall back to defaults instead of throwing
 * - Users can't break the app by manually editing URLs
 */

import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

// ============================================================================
// Calendar View Search Params
// Used in /calendars/$calendarId
// ============================================================================

export const calendarViewModes = ["list", "calendar"] as const;
export type CalendarViewMode = (typeof calendarViewModes)[number];

/** Sub-views within the calendar mode (react-big-calendar views) */
export const calendarSubViews = ["month", "week", "day"] as const;
export type CalendarSubView = (typeof calendarSubViews)[number];

export const calendarDateFilters = ["all", "today", "week", "month"] as const;
export type CalendarDateFilter = (typeof calendarDateFilters)[number];

export const calendarSortOptions = ["date", "name", "duration"] as const;
export type CalendarSortBy = (typeof calendarSortOptions)[number];

export const calendarViewSearchSchema = z.object({
	/** View mode: list or calendar */
	view: fallback(z.enum(calendarViewModes), "list").default("list"),
	/** Sub-view within calendar mode: month, week, or day */
	calendarView: fallback(z.enum(calendarSubViews), "month").default("month"),
	/** Date filter preset */
	dateFilter: fallback(z.enum(calendarDateFilters), "all").default("all"),
	/** Sort by field */
	sortBy: fallback(z.enum(calendarSortOptions), "date").default("date"),
	/** Search keyword */
	q: fallback(z.string(), "").default(""),
	/** Selected date for calendar view (ISO date string YYYY-MM-DD) */
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional()
		.catch(undefined),
});

export type CalendarViewSearch = z.infer<typeof calendarViewSearchSchema>;

/** Default values for calendar view - used by stripSearchParams */
export const calendarViewDefaults: CalendarViewSearch = {
	view: "list",
	calendarView: "month",
	dateFilter: "all",
	sortBy: "date",
	q: "",
	date: undefined,
};

// ============================================================================
// Merge Calendars Search Params
// Used in /calendars/merge
// ============================================================================

export const mergeCalendarsSearchSchema = z.object({
	/** Pre-selected calendar IDs */
	selected: z.string().optional(),
});

export type MergeCalendarsSearch = z.infer<typeof mergeCalendarsSearchSchema>;

export const mergeCalendarsDefaults: MergeCalendarsSearch = {
	selected: undefined,
};

/** Parse comma-separated selected IDs from URL */
export function parseSelectedIds(selected: string | undefined): string[] {
	return selected ? selected.split(",").filter(Boolean) : [];
}

// ============================================================================
// Login Page Search Params
// Used in /login
// ============================================================================

export const loginModes = ["signin", "signup"] as const;
export type LoginMode = (typeof loginModes)[number];

export const loginSearchSchema = z.object({
	/** Display mode: sign in or sign up form */
	mode: fallback(z.enum(loginModes), "signup").default("signup"),
	/** Redirect URL after successful authentication */
	redirect: z.string().optional().catch(undefined),
});

export type LoginSearch = z.infer<typeof loginSearchSchema>;

export const loginDefaults: LoginSearch = {
	mode: "signup",
	redirect: undefined,
};

// ============================================================================
// New Event Search Params
// Used in /calendars/$calendarId/events/new
// ============================================================================

export const newEventSearchSchema = z.object({
	/** Pre-filled start date (ISO datetime string) */
	start: z.string().optional(),
	/** Pre-filled end date (ISO datetime string) */
	end: z.string().optional(),
});

export type NewEventSearch = z.infer<typeof newEventSearchSchema>;

export const newEventDefaults: NewEventSearch = {
	start: undefined,
	end: undefined,
};

// ============================================================================
// Success Page Search Params
// Used in /success (payment success callback)
// ============================================================================

export const successSearchSchema = z.object({
	checkout_id: fallback(z.string(), "").default(""),
});

export type SuccessSearch = z.infer<typeof successSearchSchema>;

export const successDefaults = {
	checkout_id: "",
};
