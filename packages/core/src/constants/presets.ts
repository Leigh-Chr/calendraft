/**
 * Event presets for quick event creation
 * Provides common event configurations with smart defaults
 */

import type { AlarmData, EventFormData } from "../types/event";

export interface EventPreset {
	id: string;
	label: string;
	icon: string;
	description: string;
	defaults: Partial<EventFormData>;
	defaultDurationMinutes: number;
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
		defaultDurationMinutes: 60,
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
		defaultDurationMinutes: 30,
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
		description: "Full day, alert 1 day before",
		defaultDurationMinutes: 24 * 60,
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
		defaultDurationMinutes: 30,
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
		defaultDurationMinutes: 1,
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
		defaultDurationMinutes: 60,
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
 * Get preset label with icon
 */
export function getPresetLabel(presetId: string): string {
	const preset = getPreset(presetId);
	return preset ? `${preset.icon} ${preset.label}` : "Custom";
}

/**
 * Get default alarms for a preset
 */
export function getPresetAlarms(presetId: string): AlarmData[] {
	const preset = getPreset(presetId);
	return preset?.defaults.alarms || [];
}

/**
 * Get all preset IDs
 */
export function getAllPresetIds(): string[] {
	return EVENT_PRESETS.map((p) => p.id);
}

/**
 * Add minutes to a date string
 */
function addMinutesToDateStr(dateStr: string, minutes: number): string {
	const date = new Date(dateStr);
	date.setMinutes(date.getMinutes() + minutes);
	return date.toISOString().slice(0, 16);
}

/**
 * Apply preset to partial form data
 * Calculates end date based on preset duration
 * @param presetId - Preset ID to apply
 * @param baseData - Base form data (must include startDate)
 * @returns Form data with preset defaults applied
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

	// Calculate end date based on preset duration (only if not provided)
	if (result.startDate && !baseData.endDate) {
		result.endDate = addMinutesToDateStr(
			result.startDate,
			preset.defaultDurationMinutes,
		);
	}

	return result;
}
