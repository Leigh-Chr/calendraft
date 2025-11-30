/**
 * ICS enumeration constants and validators
 * Based on RFC 5545 specifications
 */

// ----- Event Status -----

export const EVENT_STATUS_VALUES = [
	"CONFIRMED",
	"TENTATIVE",
	"CANCELLED",
] as const;
export type EventStatusValue = (typeof EVENT_STATUS_VALUES)[number];

export function isValidEventStatus(value: string): value is EventStatusValue {
	return EVENT_STATUS_VALUES.includes(value as EventStatusValue);
}

// ----- Event Class -----

export const EVENT_CLASS_VALUES = [
	"PUBLIC",
	"PRIVATE",
	"CONFIDENTIAL",
] as const;
export type EventClassValue = (typeof EVENT_CLASS_VALUES)[number];

export function isValidEventClass(value: string): value is EventClassValue {
	return EVENT_CLASS_VALUES.includes(value as EventClassValue);
}

// ----- Event Transparency -----

export const EVENT_TRANSP_VALUES = ["OPAQUE", "TRANSPARENT"] as const;
export type EventTranspValue = (typeof EVENT_TRANSP_VALUES)[number];

export function isValidEventTransp(value: string): value is EventTranspValue {
	return EVENT_TRANSP_VALUES.includes(value as EventTranspValue);
}

// ----- Attendee Role -----

export const ATTENDEE_ROLE_VALUES = [
	"CHAIR",
	"REQ-PARTICIPANT",
	"OPT-PARTICIPANT",
	"NON-PARTICIPANT",
] as const;
export type AttendeeRoleValue = (typeof ATTENDEE_ROLE_VALUES)[number];

export function isValidAttendeeRole(value: string): value is AttendeeRoleValue {
	return ATTENDEE_ROLE_VALUES.includes(value as AttendeeRoleValue);
}

// ----- Attendee Status -----

export const ATTENDEE_STATUS_VALUES = [
	"NEEDS-ACTION",
	"ACCEPTED",
	"DECLINED",
	"TENTATIVE",
	"DELEGATED",
] as const;
export type AttendeeStatusValue = (typeof ATTENDEE_STATUS_VALUES)[number];

export function isValidAttendeeStatus(
	value: string,
): value is AttendeeStatusValue {
	return ATTENDEE_STATUS_VALUES.includes(value as AttendeeStatusValue);
}

// ----- Alarm Action -----

export const ALARM_ACTION_VALUES = ["DISPLAY", "EMAIL", "AUDIO"] as const;
export type AlarmActionValue = (typeof ALARM_ACTION_VALUES)[number];

export function isValidAlarmAction(value: string): value is AlarmActionValue {
	return ALARM_ACTION_VALUES.includes(value as AlarmActionValue);
}

// ----- Priority -----

export const PRIORITY_VALUES = {
	UNDEFINED: 0,
	HIGH: 1,
	MEDIUM: 5,
	LOW: 9,
} as const;

export function isValidPriority(value: number): boolean {
	return value >= 0 && value <= 9;
}
