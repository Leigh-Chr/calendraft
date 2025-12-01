/**
 * Constants for event form enumerations
 * Centralizes all valid values for ICS properties
 */

export const EVENT_STATUS_VALUES = [
	"CONFIRMED",
	"TENTATIVE",
	"CANCELLED",
] as const;
export type EventStatus = (typeof EVENT_STATUS_VALUES)[number];

export const EVENT_CLASS_VALUES = [
	"PUBLIC",
	"PRIVATE",
	"CONFIDENTIAL",
] as const;
export type EventClass = (typeof EVENT_CLASS_VALUES)[number];

export const EVENT_TRANSP_VALUES = ["OPAQUE", "TRANSPARENT"] as const;
export type EventTransp = (typeof EVENT_TRANSP_VALUES)[number];

// Note: These use underscores to match Prisma enum (RFC 5545 uses hyphens)
export const ATTENDEE_ROLE_VALUES = [
	"CHAIR",
	"REQ_PARTICIPANT",
	"OPT_PARTICIPANT",
	"NON_PARTICIPANT",
] as const;
export type AttendeeRole = (typeof ATTENDEE_ROLE_VALUES)[number];

// Note: These use underscores to match Prisma enum (RFC 5545 uses hyphens)
export const ATTENDEE_STATUS_VALUES = [
	"NEEDS_ACTION",
	"ACCEPTED",
	"DECLINED",
	"TENTATIVE",
	"DELEGATED",
] as const;
export type AttendeeStatus = (typeof ATTENDEE_STATUS_VALUES)[number];

export const ALARM_ACTION_VALUES = ["DISPLAY", "EMAIL", "AUDIO"] as const;
export type AlarmAction = (typeof ALARM_ACTION_VALUES)[number];

/**
 * Check if a value is a valid event status
 */
export function isValidEventStatus(value: string): value is EventStatus {
	return EVENT_STATUS_VALUES.includes(value as EventStatus);
}

/**
 * Check if a value is a valid event class
 */
export function isValidEventClass(value: string): value is EventClass {
	return EVENT_CLASS_VALUES.includes(value as EventClass);
}

/**
 * Check if a value is a valid event transparency
 */
export function isValidEventTransp(value: string): value is EventTransp {
	return EVENT_TRANSP_VALUES.includes(value as EventTransp);
}

/**
 * Check if a value is a valid attendee role
 */
export function isValidAttendeeRole(value: string): value is AttendeeRole {
	return ATTENDEE_ROLE_VALUES.includes(value as AttendeeRole);
}

/**
 * Check if a value is a valid attendee status
 */
export function isValidAttendeeStatus(value: string): value is AttendeeStatus {
	return ATTENDEE_STATUS_VALUES.includes(value as AttendeeStatus);
}

/**
 * Check if a value is a valid alarm action
 */
export function isValidAlarmAction(value: string): value is AlarmAction {
	return ALARM_ACTION_VALUES.includes(value as AlarmAction);
}
