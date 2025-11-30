/**
 * Tour step IDs used throughout the application
 * These IDs are used as element identifiers for the product tour
 */
export const TOUR_STEP_IDS = {
	// Header
	HELP_BUTTON: "tour-help-button",

	// Page /calendars - Liste des calendriers
	NEW_CALENDAR_BUTTON: "tour-new-calendar",
	IMPORT_BUTTON: "tour-import",
	CALENDAR_GRID: "tour-calendar-grid",

	// Page /calendars/$calendarId - Vue d'un calendrier
	VIEW_TOGGLE: "tour-view-toggle",
	DATE_FILTERS: "tour-date-filters",
	SEARCH_BAR: "tour-search-bar",
	ACTION_BUTTONS: "tour-actions",
	ADD_EVENT_BUTTON: "tour-add-event",
	CALENDAR_VIEW: "tour-calendar-view",

	// Account prompt
	ACCOUNT_BANNER: "tour-account-banner",
} as const;

export type TourStepId = (typeof TOUR_STEP_IDS)[keyof typeof TOUR_STEP_IDS];
