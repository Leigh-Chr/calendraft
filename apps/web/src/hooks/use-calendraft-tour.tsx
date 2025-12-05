import { useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TourStep } from "@/components/tour";
import { useTour } from "@/components/tour";
import { TOUR_STEP_IDS } from "@/lib/tour-constants";

const TOUR_STORAGE_KEY = "calendraft_tour_completed";

/**
 * Check if the tour has been completed
 */
export function isTourCompleted(): boolean {
	if (typeof window === "undefined") return false;
	return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

/**
 * Mark the tour as completed
 */
export function markTourCompleted(): void {
	localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

/**
 * Reset the tour completion status
 */
export function resetTourCompletion(): void {
	localStorage.removeItem(TOUR_STORAGE_KEY);
}

/**
 * Build tour steps for the calendars list page
 */
function buildCalendarsListSteps(): TourStep[] {
	return [
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">➕ Create a calendar</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Click here to create a new empty calendar. You can then add your
						events to it.
					</p>
				</div>
			),
			selectorId: TOUR_STEP_IDS.NEW_CALENDAR_BUTTON,
			position: "bottom",
		},
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">📥 Import a file</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Import a <code className="text-primary">.ics</code> file from Google
						Calendar, Apple Calendar, Outlook, or any other application.
					</p>
				</div>
			),
			selectorId: TOUR_STEP_IDS.IMPORT_BUTTON,
			position: "bottom",
		},
	];
}

/**
 * Build tour steps for the calendar view page
 */
function buildCalendarViewSteps(): TourStep[] {
	return [
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">📝 Add an event</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Create a new event with title, dates, location, and description.
					</p>
					<p className="text-muted-foreground text-xs">
						💡 You can also click directly on a time slot in the calendar view!
					</p>
				</div>
			),
			selectorId: TOUR_STEP_IDS.ADD_EVENT_BUTTON,
			position: "bottom",
		},
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">🔀 Change view</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Switch between the <strong>List</strong> view to see all your
						events, and the <strong>Calendar</strong> view for a monthly
						visualization.
					</p>
				</div>
			),
			selectorId: TOUR_STEP_IDS.VIEW_TOGGLE,
			position: "bottom",
		},
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">📅 Filter by period</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Quickly filter your events: <strong>Today</strong>,{" "}
						<strong>This week</strong>, <strong>This month</strong>, or{" "}
						<strong>All</strong>.
					</p>
				</div>
			),
			selectorId: TOUR_STEP_IDS.DATE_FILTERS,
			position: "bottom",
		},
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">🔍 Search and sort</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						Search for an event by keyword or sort by date, name, or duration.
					</p>
				</div>
			),
			selectorId: TOUR_STEP_IDS.SEARCH_BAR,
			position: "bottom",
		},
		{
			content: (
				<div className="space-y-2">
					<h3 className="font-semibold text-base">⚡ Quick actions</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">
						From this menu, you can:
					</p>
					<ul className="mt-1 space-y-0.5 text-muted-foreground text-sm">
						<li>📥 Import events</li>
						<li>✨ Clean duplicates</li>
						<li>🔀 Merge with other calendars</li>
						<li>📤 Export as .ics</li>
					</ul>
				</div>
			),
			selectorId: TOUR_STEP_IDS.ACTION_BUTTONS,
			position: "bottom",
		},
	];
}

/**
 * Build steps based on the current page
 */
function buildStepsForPage(pathname: string): TourStep[] {
	// Calendars page (/calendars)
	if (pathname === "/calendars") {
		return buildCalendarsListSteps();
	}

	// Calendar view page (/calendars/$calendarId)
	if (pathname.match(/^\/calendars\/[^/]+$/)) {
		return buildCalendarViewSteps();
	}

	return [];
}

/**
 * Custom hook to manage the Calendraft tour
 */
export function useCalendraftTour() {
	const location = useLocation();
	const [openDialog, setOpenDialog] = useState(false);
	const {
		setSteps,
		startTour,
		endTour,
		isActive,
		isTourCompleted: tourCompleted,
		setIsTourCompleted,
		currentStep,
		totalSteps,
	} = useTour();

	// Build steps based on current page
	const steps = useMemo(
		() => buildStepsForPage(location.pathname),
		[location.pathname],
	);

	// Update steps when page changes
	useEffect(() => {
		if (steps.length > 0) {
			setSteps(steps);
		}
	}, [steps, setSteps]);

	// Auto-show dialog on first visit to /calendars
	useEffect(() => {
		const completed = isTourCompleted();
		const isCalendarsPage = location.pathname === "/calendars";

		if (!completed && isCalendarsPage && !isActive) {
			// Small delay to let the page render
			const timer = setTimeout(() => {
				setOpenDialog(true);
			}, 800);
			return () => clearTimeout(timer);
		}
	}, [location.pathname, isActive]);

	// Handle tour completion
	const handleComplete = useCallback(() => {
		markTourCompleted();
		setIsTourCompleted(true);
	}, [setIsTourCompleted]);

	// Handle skipping the tour
	const handleSkip = useCallback(() => {
		markTourCompleted();
		setIsTourCompleted(true);
		setOpenDialog(false);
	}, [setIsTourCompleted]);

	// Restart the tour (for help button)
	const restartTour = useCallback(() => {
		resetTourCompletion();
		setIsTourCompleted(false);
		setOpenDialog(true);
	}, [setIsTourCompleted]);

	// Start tour directly (without dialog)
	const handleStartTour = useCallback(() => {
		setOpenDialog(false);
		// Small delay to ensure dialog is closed
		setTimeout(() => {
			startTour();
		}, 100);
	}, [startTour]);

	return {
		// Dialog state
		openDialog,
		setOpenDialog,

		// Tour state
		isActive,
		isTourCompleted: tourCompleted || isTourCompleted(),
		currentStep,
		totalSteps,

		// Actions
		startTour: handleStartTour,
		endTour,
		restartTour,
		handleComplete,
		handleSkip,

		// Steps info
		hasSteps: steps.length > 0,
	};
}
