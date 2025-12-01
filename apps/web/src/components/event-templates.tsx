/**
 * Event Templates - Modèles prédéfinis pour création rapide d'événements
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
		name: "Réunion",
		icon: <Users className="h-4 w-4" />,
		color: "#3b82f6", // blue
		duration: 60,
		title: "Réunion",
		alarm: "-PT15M",
	},
	{
		id: "video-call",
		name: "Visio",
		icon: <Video className="h-4 w-4" />,
		color: "#8b5cf6", // purple
		duration: 30,
		title: "Appel vidéo",
		location: "Google Meet / Zoom",
		alarm: "-PT5M",
	},
	{
		id: "phone-call",
		name: "Appel",
		icon: <Phone className="h-4 w-4" />,
		color: "#06b6d4", // cyan
		duration: 15,
		title: "Appel téléphonique",
		alarm: "-PT5M",
	},
	{
		id: "work",
		name: "Travail",
		icon: <Briefcase className="h-4 w-4" />,
		color: "#f59e0b", // amber
		duration: 480, // 8 hours
		title: "Journée de travail",
		rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
		categories: "Travail",
	},
	{
		id: "lunch",
		name: "Déjeuner",
		icon: <Utensils className="h-4 w-4" />,
		color: "#f97316", // orange
		duration: 60,
		title: "Déjeuner",
		categories: "Personnel",
	},
	{
		id: "coffee",
		name: "Café",
		icon: <Coffee className="h-4 w-4" />,
		color: "#78716c", // stone
		duration: 30,
		title: "Pause café",
		categories: "Personnel",
	},
	{
		id: "sport",
		name: "Sport",
		icon: <Dumbbell className="h-4 w-4" />,
		color: "#22c55e", // green
		duration: 90,
		title: "Séance de sport",
		categories: "Sport,Santé",
		rrule: "FREQ=WEEKLY",
	},
	{
		id: "doctor",
		name: "Médecin",
		icon: <Stethoscope className="h-4 w-4" />,
		color: "#ef4444", // red
		duration: 30,
		title: "Rendez-vous médical",
		categories: "Santé",
		alarm: "-PT1H",
	},
	{
		id: "study",
		name: "Études",
		icon: <GraduationCap className="h-4 w-4" />,
		color: "#6366f1", // indigo
		duration: 120,
		title: "Session d'étude",
		categories: "Études",
	},
	{
		id: "birthday",
		name: "Anniversaire",
		icon: <PartyPopper className="h-4 w-4" />,
		color: "#ec4899", // pink
		duration: 1440, // All day
		title: "Anniversaire",
		rrule: "FREQ=YEARLY",
		categories: "Personnel,Anniversaire",
		alarm: "-P1D", // 1 day before
	},
	{
		id: "date",
		name: "Rendez-vous",
		icon: <Heart className="h-4 w-4" />,
		color: "#f43f5e", // rose
		duration: 120,
		title: "Rendez-vous",
		categories: "Personnel",
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
	};
}
