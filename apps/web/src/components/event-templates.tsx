/**
 * Event Templates - Predefined templates for quick event creation
 */

import { addHours, format, setHours, setMinutes } from "date-fns";
import {
	Briefcase,
	Coffee,
	Dumbbell,
	GraduationCap,
	Heart,
	PartyPopper,
	Phone,
	Plane,
	Stethoscope,
	Users,
	Utensils,
	Video,
} from "lucide-react";
import type { ReactNode } from "react";

export interface EventTemplate {
	id: string;
	name: string;
	icon: ReactNode;
	color: string;
	/** Default duration in minutes */
	duration: number;
	/** Default title */
	title: string;
	/** Default description */
	description?: string;
	/** Default location */
	location?: string;
	/** RRULE for recurring templates */
	rrule?: string;
	/** Categories/tags */
	categories?: string;
	/** Alarm trigger (e.g., "-PT15M" for 15 min before) */
	alarm?: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
	{
		id: "meeting",
		name: "Meeting",
		icon: <Users className="h-4 w-4" />,
		color: "#3b82f6", // blue
		duration: 60,
		title: "Meeting",
		alarm: "-PT15M",
	},
	{
		id: "video-call",
		name: "Video call",
		icon: <Video className="h-4 w-4" />,
		color: "#8b5cf6", // purple
		duration: 30,
		title: "Video call",
		location: "Google Meet / Zoom",
		alarm: "-PT5M",
	},
	{
		id: "phone-call",
		name: "Call",
		icon: <Phone className="h-4 w-4" />,
		color: "#06b6d4", // cyan
		duration: 15,
		title: "Phone call",
		alarm: "-PT5M",
	},
	{
		id: "work",
		name: "Work",
		icon: <Briefcase className="h-4 w-4" />,
		color: "#f59e0b", // amber
		duration: 480, // 8 hours
		title: "Work day",
		rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
		categories: "Work",
	},
	{
		id: "lunch",
		name: "Lunch",
		icon: <Utensils className="h-4 w-4" />,
		color: "#f97316", // orange
		duration: 60,
		title: "Lunch",
		categories: "Personal",
	},
	{
		id: "coffee",
		name: "Coffee",
		icon: <Coffee className="h-4 w-4" />,
		color: "#78716c", // stone
		duration: 30,
		title: "Coffee break",
		categories: "Personal",
	},
	{
		id: "sport",
		name: "Sport",
		icon: <Dumbbell className="h-4 w-4" />,
		color: "#22c55e", // green
		duration: 90,
		title: "Workout session",
		categories: "Sport,Health",
		rrule: "FREQ=WEEKLY",
	},
	{
		id: "doctor",
		name: "Doctor",
		icon: <Stethoscope className="h-4 w-4" />,
		color: "#ef4444", // red
		duration: 30,
		title: "Medical appointment",
		categories: "Health",
		alarm: "-PT1H",
	},
	{
		id: "study",
		name: "Study",
		icon: <GraduationCap className="h-4 w-4" />,
		color: "#c2703c", // amber
		duration: 120,
		title: "Study session",
		categories: "Study",
	},
	{
		id: "birthday",
		name: "Birthday",
		icon: <PartyPopper className="h-4 w-4" />,
		color: "#ec4899", // pink
		duration: 1440, // All day
		title: "Birthday",
		rrule: "FREQ=YEARLY",
		categories: "Personal,Birthday",
		alarm: "-P1D", // 1 day before
	},
	{
		id: "date",
		name: "Date",
		icon: <Heart className="h-4 w-4" />,
		color: "#f43f5e", // rose
		duration: 120,
		title: "Date",
		categories: "Personal",
	},
	{
		id: "travel",
		name: "Voyage",
		icon: <Plane className="h-4 w-4" />,
		color: "#0ea5e9", // sky
		duration: 1440, // All day
		title: "Voyage",
		categories: "Voyage",
		alarm: "-P1D",
	},
];

/**
 * Get default start/end dates for a template
 */
export function getTemplateDates(
	template: EventTemplate,
	baseDate?: Date,
): { startDate: Date; endDate: Date } {
	const now = baseDate || new Date();
	let startDate: Date;

	// Round to nearest 30 minutes
	const minutes = now.getMinutes();
	const roundedMinutes = minutes < 30 ? 30 : 0;
	const addHoursAmount = minutes < 30 ? 0 : 1;

	startDate = setMinutes(
		setHours(now, now.getHours() + addHoursAmount),
		roundedMinutes,
	);

	// For all-day events, start at beginning of day
	if (template.duration >= 1440) {
		startDate = setHours(setMinutes(now, 0), 0);
	}

	// Calculate end date
	const endDate = addHours(startDate, template.duration / 60);

	return { startDate, endDate };
}

/**
 * Convert template to event form data
 */
export function templateToFormData(
	template: EventTemplate,
	baseDate?: Date,
): {
	title: string;
	startDate: string;
	endDate: string;
	description?: string;
	location?: string;
	categories?: string;
	rrule?: string;
	color?: string;
	alarms?: Array<{ trigger: string; action: string }>;
} {
	const { startDate, endDate } = getTemplateDates(template, baseDate);

	return {
		title: template.title,
		startDate: format(startDate, "yyyy-MM-dd'T'HH:mm"),
		endDate: format(endDate, "yyyy-MM-dd'T'HH:mm"),
		description: template.description,
		location: template.location,
		categories: template.categories,
		rrule: template.rrule,
		color: template.color,
		// Include alarm from template if defined
		alarms: template.alarm
			? [{ trigger: template.alarm, action: "DISPLAY" }]
			: undefined,
	};
}
