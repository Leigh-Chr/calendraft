/**
 * Field length limits for validation
 * Shared between frontend and backend
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
	NAME: 200,
	EMAIL: 200, // RFC 5321 maximum is 254, but we use 200 for consistency

	// Alarm fields
	ALARM_SUMMARY: 255,
	ALARM_DESCRIPTION: 1000,
	ALARM_DURATION: 50,
	ALARM_TRIGGER: 100,

	// Recurrence
	RRULE: 500,

	// Categories and tags
	CATEGORY: 100,
	TAG: 100,
	CATEGORIES_STRING: 500, // Comma-separated categories
	RESOURCES_STRING: 500, // Comma-separated resources

	// Other text fields
	COMMENT: 1000,
	CONTACT: 500,
	RECURRENCE_ID: 500,
	RELATED_TO: 500,
} as const;
