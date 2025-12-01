/**
 * @calendraft/core
 * Core domain logic and types for calendar management
 */

// ----- Types -----

export type {
	AlarmData,
	AttendeeData,
	CalendarEntity,
	CalendarSummary,
	EventEntity,
	EventFormData,
	RecurrenceConfig,
	RecurrenceFrequency,
	Weekday,
} from "./types";

export { buildRRule, parseRRule } from "./types";

// ----- Utils -----

export {
	addDaysToDate,
	addHoursToDate,
	addMinutesToDate,
	addTag,
	deepClone,
	// Deep equality
	deepEqual,
	endOfDay,
	formatDateShort,
	formatEventDuration,
	getDurationMinutes,
	getLastTag,
	hasTag,
	// Form
	initializeFormData,
	isSameDay,
	isValidDate,
	// Dates
	normalizeDate,
	// Tags
	parseTags,
	removeTag,
	shallowClone,
	startOfDay,
	stringifyTags,
	toDateTimeLocal,
	transformEventFormData,
} from "./utils";

// ----- Constants -----

export {
	ALARM_ACTION_VALUES,
	type AlarmActionValue,
	ATTENDEE_ROLE_VALUES,
	ATTENDEE_STATUS_VALUES,
	type AttendeeRoleValue,
	type AttendeeStatusValue,
	applyPreset,
	EVENT_CLASS_VALUES,
	// Presets
	EVENT_PRESETS,
	// ICS Enums (single source of truth for these values)
	EVENT_STATUS_VALUES,
	EVENT_TRANSP_VALUES,
	type EventClassValue,
	type EventPreset,
	type EventStatusValue,
	type EventTranspValue,
	// Field limits
	FIELD_LIMITS,
	type FieldLimitKey,
	getAllPresetIds,
	getPreset,
	getPresetAlarms,
	getPresetLabel,
	isValidAlarmAction,
	isValidAttendeeRole,
	isValidAttendeeStatus,
	isValidEventClass,
	isValidEventStatus,
	isValidEventTransp,
	isValidPriority,
	PRIORITY_VALUES,
} from "./constants";

// ----- Validation -----

export {
	getFieldError,
	hasErrors,
	isValidEmail,
	isValidHexColor,
	isValidUrl,
	type ValidationError,
	type ValidationResult,
	validateAlarm,
	validateAttendee,
	validateEventForm,
	validateLength,
	validateRequired,
} from "./validation";

// ----- Plans -----

export {
	getDefaultPlanType,
	getPlanLimits,
	isWithinLimit,
	PLAN_LIMITS,
	type PlanLimits,
	PlanType,
} from "./plans";
