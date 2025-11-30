/**
 * Field length limits for validation and security
 * Prevents excessively long inputs and potential attacks
 */

export const FIELD_LIMITS = {
	// Basic info
	TITLE: 255,
	LOCATION: 500,
	DESCRIPTION: 10000,

	// URLs and identifiers
	URL: 2083, // Maximum URL length
	UID: 255,

	// Organizer and attendee
	NAME: 255,
	EMAIL: 254, // RFC 5321 maximum

	// Alarm fields
	ALARM_SUMMARY: 255,
	ALARM_DESCRIPTION: 1000,
	ALARM_DURATION: 50,

	// Recurrence
	RRULE: 500,

	// Categories and tags
	CATEGORY: 100,
	TAG: 100,

	// Other text fields
	COMMENT: 1000,
	CONTACT: 500,

	// Color
	COLOR: 7, // #RRGGBB
} as const;

export type FieldLimitKey = keyof typeof FIELD_LIMITS;
