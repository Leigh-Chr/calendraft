/**
 * Constants exports
 */

export { FIELD_LIMITS, type FieldLimitKey } from "./field-limits";
// ICS Enum values and validators
export {
	ALARM_ACTION_VALUES,
	type AlarmActionValue,
	ATTENDEE_ROLE_VALUES,
	ATTENDEE_STATUS_VALUES,
	type AttendeeRoleValue,
	type AttendeeStatusValue,
	EVENT_CLASS_VALUES,
	EVENT_STATUS_VALUES,
	EVENT_TRANSP_VALUES,
	type EventClassValue,
	type EventStatusValue,
	type EventTranspValue,
	isValidAlarmAction,
	isValidAttendeeRole,
	isValidAttendeeStatus,
	isValidEventClass,
	isValidEventStatus,
	isValidEventTransp,
	isValidPriority,
	PRIORITY_VALUES,
} from "./ics-enums";
export {
	applyPreset,
	EVENT_PRESETS,
	type EventPreset,
	getAllPresetIds,
	getPreset,
	getPresetAlarms,
	getPresetLabel,
} from "./presets";
