import { z } from "zod";
import {
	emailSchema,
	nullableEmailSchema,
	nullableTrimmedStringSchema,
	urlSchema,
} from "./common-schemas";
import { FIELD_LIMITS } from "./field-limits";

/**
 * Attendee schema with RFC 5545 validation
 */
export const attendeeSchema = z.object({
	name: nullableTrimmedStringSchema(FIELD_LIMITS.NAME),
	email: emailSchema,
	role: z
		.enum(["CHAIR", "REQ_PARTICIPANT", "OPT_PARTICIPANT", "NON_PARTICIPANT"])
		.optional()
		.nullable(),
	status: z
		.enum(["NEEDS_ACTION", "ACCEPTED", "DECLINED", "TENTATIVE", "DELEGATED"])
		.optional()
		.nullable(),
	rsvp: z.boolean().optional().default(false),
});

/**
 * Alarm schema with RFC 5545 validation
 */
export const alarmSchema = z
	.object({
		trigger: z
			.string()
			.trim()
			.min(1, "Trigger is required")
			.max(FIELD_LIMITS.ALARM_TRIGGER)
			.transform((val) => val.trim()), // Duration format like "-PT15M" or absolute datetime
		action: z.enum(["DISPLAY", "EMAIL", "AUDIO"]),
		summary: nullableTrimmedStringSchema(FIELD_LIMITS.ALARM_SUMMARY), // Aligned with frontend FIELD_LIMITS.ALARM_SUMMARY
		description: nullableTrimmedStringSchema(FIELD_LIMITS.ALARM_DESCRIPTION), // Aligned with frontend FIELD_LIMITS.ALARM_DESCRIPTION
		duration: nullableTrimmedStringSchema(FIELD_LIMITS.ALARM_DURATION), // Duration format
		repeat: z.number().int().min(0).max(1000).optional().nullable(),
	})
	.refine(
		(data) => {
			// RFC 5545: DISPLAY action requires DESCRIPTION (we use summary field for this)
			if (data.action === "DISPLAY") {
				return data.summary && data.summary.trim().length > 0;
			}
			return true;
		},
		{
			message: "DISPLAY alarms require a summary (DESCRIPTION in RFC 5545)",
			path: ["summary"],
		},
	)
	.refine(
		(data) => {
			// RFC 5545: EMAIL action requires both DESCRIPTION and SUMMARY
			if (data.action === "EMAIL") {
				return (
					data.description &&
					data.description.trim().length > 0 &&
					data.summary &&
					data.summary.trim().length > 0
				);
			}
			return true;
		},
		{
			message: "EMAIL alarms require both summary and description (RFC 5545)",
			path: ["description"],
		},
	);

/**
 * Schema for JSON date arrays (rdate/exdate)
 */
export const jsonDateArraySchema = z
	.string()
	.refine(
		(val) => {
			if (!val || val.trim() === "") return true;
			try {
				const parsed = JSON.parse(val);
				return (
					Array.isArray(parsed) &&
					parsed.every(
						(d) => typeof d === "string" && !Number.isNaN(Date.parse(d)),
					)
				);
			} catch {
				return false;
			}
		},
		{ message: "Must be a valid JSON array of ISO date strings" },
	)
	.optional()
	.nullable();

/**
 * Valid FREQ values for RRULE (RFC 5545)
 */
const VALID_FREQ_VALUES = [
	"SECONDLY",
	"MINUTELY",
	"HOURLY",
	"DAILY",
	"WEEKLY",
	"MONTHLY",
	"YEARLY",
] as const;

/**
 * Validate FREQ parameter in RRULE
 */
function validateFreq(parts: string[]): boolean {
	const freqPart = parts.find((p) => p.trim().startsWith("FREQ="));
	if (!freqPart) return false;

	const freqValue = freqPart.split("=")[1]?.trim();
	if (!freqValue) return false;

	return VALID_FREQ_VALUES.includes(
		freqValue as (typeof VALID_FREQ_VALUES)[number],
	);
}

/**
 * Validate COUNT parameter in RRULE
 */
function validateCount(parts: string[]): boolean {
	const countPart = parts.find((p) => p.trim().startsWith("COUNT="));
	if (!countPart) return true; // COUNT is optional

	const countValue = countPart.split("=")[1]?.trim();
	const count = Number.parseInt(countValue || "", 10);
	return !Number.isNaN(count) && count >= 1;
}

/**
 * Validate INTERVAL parameter in RRULE
 */
function validateInterval(parts: string[]): boolean {
	const intervalPart = parts.find((p) => p.trim().startsWith("INTERVAL="));
	if (!intervalPart) return true; // INTERVAL is optional

	const intervalValue = intervalPart.split("=")[1]?.trim();
	const interval = Number.parseInt(intervalValue || "", 10);
	return !Number.isNaN(interval) && interval >= 1;
}

/**
 * Validate RRULE structure (RFC 5545 compliant)
 */
function validateRRULE(val: string): boolean {
	if (!val || val.trim() === "") return true;

	const parts = val.split(";");

	// RFC 5545: RRULE must contain FREQ parameter
	if (!parts.some((p) => p.trim().startsWith("FREQ="))) {
		return false;
	}

	if (!validateFreq(parts)) return false;

	// RFC 5545: UNTIL and COUNT are mutually exclusive
	const hasUntil = parts.some((p) => p.trim().startsWith("UNTIL="));
	const hasCount = parts.some((p) => p.trim().startsWith("COUNT="));
	if (hasUntil && hasCount) return false;

	if (!validateCount(parts)) return false;
	if (!validateInterval(parts)) return false;

	return true;
}

/**
 * Schema for RRULE validation (RFC 5545 compliant)
 */
export const rruleSchema = z
	.string()
	.max(FIELD_LIMITS.RRULE)
	.refine(validateRRULE, {
		message:
			"Invalid RRULE format: must contain valid FREQ, and UNTIL/COUNT are mutually exclusive",
	})
	.optional()
	.nullable();

/**
 * Schema for geographic coordinates validation
 */
export const geoCoordinatesSchema = z
	.object({
		geoLatitude: z.number().min(-90).max(90).optional().nullable(),
		geoLongitude: z.number().min(-180).max(180).optional().nullable(),
	})
	.refine(
		(data) => {
			// Both or neither must be present
			const hasLat =
				data.geoLatitude !== null && data.geoLatitude !== undefined;
			const hasLon =
				data.geoLongitude !== null && data.geoLongitude !== undefined;
			return hasLat === hasLon;
		},
		{
			message: "Both latitude and longitude must be provided together",
			path: ["geoLongitude"],
		},
	);

/**
 * Schema for RECURRENCE-ID validation (ICS date-time format)
 */
export const recurrenceIdSchema = z
	.string()
	.trim()
	.max(FIELD_LIMITS.RECURRENCE_ID)
	.refine(
		(val) => {
			if (!val || val.trim() === "") return true;
			// Basic format check: YYYYMMDDTHHmmss[Z] or YYYYMMDD
			const icsDatePattern = /^\d{8}(T\d{6}(Z)?)?$/;
			return icsDatePattern.test(val.trim());
		},
		{
			message:
				"RECURRENCE-ID must be in ICS format (YYYYMMDDTHHmmssZ or YYYYMMDD)",
		},
	)
	.transform((val) => (val === "" ? null : val.trim()))
	.nullable()
	.optional();

/**
 * Schema for UID validation
 */
export const uidSchema = z
	.string()
	.trim()
	.max(FIELD_LIMITS.UID)
	.refine(
		(val) => {
			if (!val || val.trim() === "") return true;
			// UID should not contain spaces
			return !/\s/.test(val.trim());
		},
		{
			message: "UID cannot contain spaces",
		},
	)
	.transform((val) => (val === "" ? null : val.trim()))
	.nullable()
	.optional();

/**
 * Schema for color validation (hex format)
 */
export const colorSchema = z
	.string()
	.trim()
	.regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (#RRGGBB)")
	.transform((val) => (val === "" ? null : val.trim()))
	.nullable()
	.optional();

/**
 * Complete event schema for create operations
 */
export const eventCreateSchema = z
	.object({
		calendarId: z.string(),
		title: z
			.string()
			.trim()
			.min(1, "Title is required")
			.max(FIELD_LIMITS.TITLE)
			.transform((val) => val.trim()),
		startDate: z.coerce.date(),
		endDate: z.coerce.date(),
		description: nullableTrimmedStringSchema(FIELD_LIMITS.DESCRIPTION),
		location: nullableTrimmedStringSchema(FIELD_LIMITS.LOCATION),

		// Basic metadata
		status: z
			.enum(["CONFIRMED", "TENTATIVE", "CANCELLED"])
			.optional()
			.nullable(),
		priority: z.number().int().min(0).max(9).optional().nullable(),
		categories: nullableTrimmedStringSchema(FIELD_LIMITS.CATEGORIES_STRING), // Comma-separated
		url: urlSchema,
		class: z.enum(["PUBLIC", "PRIVATE", "CONFIDENTIAL"]).optional().nullable(),
		comment: nullableTrimmedStringSchema(FIELD_LIMITS.COMMENT),
		contact: nullableTrimmedStringSchema(FIELD_LIMITS.CONTACT),
		resources: nullableTrimmedStringSchema(FIELD_LIMITS.RESOURCES_STRING), // Comma-separated
		sequence: z.number().int().min(0).optional().nullable(),
		transp: z.enum(["OPAQUE", "TRANSPARENT"]).optional().nullable(),

		// Recurrence
		rrule: rruleSchema,
		rdate: jsonDateArraySchema,
		exdate: jsonDateArraySchema,

		// Geography
		geoLatitude: z.number().min(-90).max(90).optional().nullable(),
		geoLongitude: z.number().min(-180).max(180).optional().nullable(),

		// Organizer
		organizerName: nullableTrimmedStringSchema(FIELD_LIMITS.NAME),
		organizerEmail: nullableEmailSchema,

		// Additional properties (RFC 5545)
		uid: uidSchema,
		recurrenceId: recurrenceIdSchema,
		relatedTo: z.string().max(FIELD_LIMITS.RELATED_TO).optional().nullable(),

		// Extensions (RFC 7986)
		color: colorSchema,

		// Relations
		attendees: z.array(attendeeSchema).optional(),
		alarms: z.array(alarmSchema).optional(),
	})
	.refine(
		(data) => {
			// End date must be after start date
			return data.endDate > data.startDate;
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	)
	.refine(
		(data) => {
			// Both geo coordinates or neither
			const hasLat =
				data.geoLatitude !== null && data.geoLatitude !== undefined;
			const hasLon =
				data.geoLongitude !== null && data.geoLongitude !== undefined;
			return hasLat === hasLon;
		},
		{
			message: "Both latitude and longitude must be provided together",
			path: ["geoLongitude"],
		},
	)
	.refine(
		(data) => {
			// RECURRENCE-ID requires RRULE
			if (data.recurrenceId && !data.rrule) {
				return false;
			}
			return true;
		},
		{
			message: "RECURRENCE-ID requires RRULE to be set",
			path: ["recurrenceId"],
		},
	);

/**
 * Schema for event update operations (all fields optional)
 */
export const eventUpdateSchema = eventCreateSchema
	.omit({ calendarId: true })
	.extend({
		id: z.string(),
		title: z
			.string()
			.trim()
			.min(1)
			.max(FIELD_LIMITS.TITLE)
			.transform((val) => val.trim())
			.optional(),
		startDate: z.coerce.date().optional(),
		endDate: z.coerce.date().optional(),
	})
	.refine(
		(data) => {
			// If both dates are provided, end must be after start
			if (data.startDate && data.endDate) {
				return data.endDate > data.startDate;
			}
			return true;
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	);

/**
 * Schema for event form data (frontend format with string dates)
 */
export const eventFormDataSchema = z
	.object({
		title: z
			.string()
			.trim()
			.min(1, "Title is required")
			.max(FIELD_LIMITS.TITLE)
			.transform((val) => val.trim()),
		startDate: z.string().min(1, "Start date is required"),
		endDate: z.string().min(1, "End date is required"),
		description: nullableTrimmedStringSchema(FIELD_LIMITS.DESCRIPTION),
		location: nullableTrimmedStringSchema(FIELD_LIMITS.LOCATION),

		// Basic metadata
		status: z
			.enum(["CONFIRMED", "TENTATIVE", "CANCELLED"])
			.optional()
			.nullable(),
		priority: z.number().int().min(0).max(9).optional().nullable(),
		categories: nullableTrimmedStringSchema(FIELD_LIMITS.CATEGORIES_STRING),
		url: urlSchema,
		class: z.enum(["PUBLIC", "PRIVATE", "CONFIDENTIAL"]).optional().nullable(),
		comment: nullableTrimmedStringSchema(FIELD_LIMITS.COMMENT),
		contact: nullableTrimmedStringSchema(FIELD_LIMITS.CONTACT),
		resources: nullableTrimmedStringSchema(FIELD_LIMITS.RESOURCES_STRING),
		transp: z.enum(["OPAQUE", "TRANSPARENT"]).optional().nullable(),

		// Recurrence
		rrule: rruleSchema,
		rdate: jsonDateArraySchema,
		exdate: jsonDateArraySchema,

		// Geography
		geoLatitude: z.number().min(-90).max(90).optional().nullable(),
		geoLongitude: z.number().min(-180).max(180).optional().nullable(),

		// Organizer
		organizerName: nullableTrimmedStringSchema(FIELD_LIMITS.NAME),
		organizerEmail: nullableEmailSchema,

		// Additional properties (RFC 5545)
		uid: uidSchema,
		recurrenceId: recurrenceIdSchema,
		relatedTo: nullableTrimmedStringSchema(FIELD_LIMITS.RELATED_TO),
		sequence: z.number().int().min(0).optional().nullable(),

		// Extensions (RFC 7986)
		color: colorSchema,

		// Relations
		attendees: z.array(attendeeSchema).optional(),
		alarms: z.array(alarmSchema).optional(),
	})
	.refine(
		(data) => {
			// Validate dates are valid and end is after start
			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			if (Number.isNaN(start.getTime())) {
				return false;
			}
			if (Number.isNaN(end.getTime())) {
				return false;
			}
			return end > start;
		},
		{
			message: "End date must be after start date",
			path: ["endDate"],
		},
	)
	.refine(
		(data) => {
			// Both geo coordinates or neither
			const hasLat =
				data.geoLatitude !== null && data.geoLatitude !== undefined;
			const hasLon =
				data.geoLongitude !== null && data.geoLongitude !== undefined;
			return hasLat === hasLon;
		},
		{
			message: "Latitude and longitude must be defined together",
			path: ["geoLongitude"],
		},
	)
	.refine(
		(data) => {
			// RECURRENCE-ID requires RRULE
			if (data.recurrenceId && !data.rrule) {
				return false;
			}
			return true;
		},
		{
			message: "RECURRENCE-ID requires that RRULE be defined",
			path: ["recurrenceId"],
		},
	);
