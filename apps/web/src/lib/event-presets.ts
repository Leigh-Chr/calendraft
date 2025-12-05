/**
 * Event presets for quick event creation
 * Provides common event configurations with smart defaults
 */

import type { EventFormData } from "@/lib/event-form-types";

export interface EventPreset {
	id: string;
	label: string;
	icon: string;
	description: string;
	defaults: Partial<EventFormData>;
}

/**
 * Calculate end date based on start date and duration in minutes
 */
function addMinutes(dateStr: string, minutes: number): string {
	const date = new Date(dateStr);
	date.setMinutes(date.getMinutes() + minutes);
	return date.toISOString().slice(0, 16);
}

/**
 * Get default end date for a preset (1 hour from now)
 */
function getDefaultEnd(startDate: string): string {
	return addMinutes(startDate, 60);
}

/**
 * Predefined event presets
 */
export const EVENT_PRESETS: EventPreset[] = [
	{
		id: "meeting",
		label: "Meeting",
		icon: "👥",
		description: "1 hour, alert 15min before",
		defaults: {
			status: "CONFIRMED",
			class: "PUBLIC",
			transp: "OPAQUE",
			priority: 5,
			alarms: [
				{
					trigger: "-PT15M",
					action: "DISPLAY",
				},
			],
		},
	},
	{
		id: "call",
		label: "Call",
		icon: "📞",
		description: "30 minutes, alert 5min before",
		defaults: {
			status: "CONFIRMED",
			class: "PRIVATE",
			transp: "OPAQUE",
			alarms: [
				{
					trigger: "-PT5M",
					action: "DISPLAY",
				},
			],
		},
	},
	{
		id: "birthday",
		label: "Birthday",
		icon: "🎂",
		description: "All day, alert 1 day before",
		defaults: {
			status: "CONFIRMED",
			class: "PRIVATE",
			transp: "TRANSPARENT",
			priority: 5,
			alarms: [
				{
					trigger: "-P1D",
					action: "DISPLAY",
				},
			],
		},
	},
	{
		id: "task",
		label: "Task",
		icon: "✅",
		description: "30 minutes, alert at start",
		defaults: {
			status: "CONFIRMED",
			class: "PRIVATE",
			transp: "OPAQUE",
			priority: 5,
			alarms: [
				{
					trigger: "PT0M",
					action: "DISPLAY",
				},
			],
		},
	},
	{
		id: "reminder",
		label: "Reminder",
		icon: "🔔",
		description: "No duration, alert only",
		defaults: {
			status: "CONFIRMED",
			class: "PRIVATE",
			transp: "TRANSPARENT",
			alarms: [
				{
					trigger: "PT0M",
					action: "DISPLAY",
				},
			],
		},
	},
	{
		id: "custom",
		label: "Custom",
		icon: "⚙️",
		description: "Manual configuration",
		defaults: {
			status: "CONFIRMED",
			class: "PRIVATE",
			transp: "OPAQUE",
		},
	},
];

/**
 * Get a preset by ID
 */
export function getPreset(id: string): EventPreset | undefined {
	return EVENT_PRESETS.find((p) => p.id === id);
}

/**
 * Apply preset to form data with date calculation
 */
export function applyPreset(
	presetId: string,
	baseData: Partial<EventFormData>,
): Partial<EventFormData> {
	const preset = getPreset(presetId);
	if (!preset) return baseData;

	const result = {
		...preset.defaults,
		...baseData,
	};

	// Calculate end date based on preset (only if not provided in baseData)
	if (result.startDate && !baseData.endDate) {
		if (presetId === "meeting") {
			result.endDate = addMinutes(result.startDate, 60);
		} else if (presetId === "call" || presetId === "task") {
			result.endDate = addMinutes(result.startDate, 30);
		} else if (presetId === "birthday") {
			// All day event - next day at 00:00 (full day in ICS format)
			const date = new Date(result.startDate);
			date.setDate(date.getDate() + 1);
			date.setHours(0, 0, 0, 0);
			result.endDate = date.toISOString().slice(0, 16);
		} else if (presetId === "reminder") {
			// No duration - end = start + 1 minute for valid range
			result.endDate = addMinutes(result.startDate, 1);
		} else if (presetId === "custom") {
			// Default 1 hour for custom preset
			result.endDate = addMinutes(result.startDate, 60);
		} else {
			result.endDate = getDefaultEnd(result.startDate);
		}
	}

	return result;
}

/**
 * Get preset label with icon
 */
export function getPresetLabel(presetId: string): string {
	const preset = getPreset(presetId);
	return preset ? `${preset.icon} ${preset.label}` : "Custom";
}
