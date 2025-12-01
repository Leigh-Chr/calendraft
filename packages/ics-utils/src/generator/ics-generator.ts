/**
 * Generate ICS file content from calendar events
 * Follows RFC 5545 specification
 */

import { formatDateToICS } from "../date/format";
import type { EventInput, GeneratorOptions, ParsedAlarm } from "../types";

const DEFAULT_PROD_ID = "-//Calendraft//Calendraft//EN";

/**
 * Escape text for ICS format (RFC 5545)
 */
export function escapeIcsText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "");
}

/**
 * Unescape ICS text
 */
export function unescapeIcsText(text: string): string {
	return text
		.replace(/\\n/g, "\n")
		.replace(/\\,/g, ",")
		.replace(/\\;/g, ";")
		.replace(/\\\\/g, "\\");
}

/**
 * Generate basic event properties
 */
function generateEventBasicProperties(
	event: EventInput,
	lines: string[],
): void {
	const uid = event.uid || `${crypto.randomUUID()}@calendraft`;
	lines.push(`UID:${uid}`);
	lines.push(`DTSTAMP:${formatDateToICS(new Date())}`);
	lines.push(`DTSTART:${formatDateToICS(event.startDate)}`);
	lines.push(`DTEND:${formatDateToICS(event.endDate)}`);

	if (event.title) {
		lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
	}

	if (event.description) {
		lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
	}

	if (event.location) {
		lines.push(`LOCATION:${escapeIcsText(event.location)}`);
	}
}

/**
 * Generate event metadata properties
 */
function generateEventMetadata(event: EventInput, lines: string[]): void {
	if (event.status) {
		lines.push(`STATUS:${event.status.toUpperCase()}`);
	}

	if (event.priority !== null && event.priority !== undefined) {
		lines.push(`PRIORITY:${event.priority}`);
	}

	if (event.categories && event.categories.length > 0) {
		lines.push(`CATEGORIES:${event.categories.map(escapeIcsText).join(",")}`);
	}

	if (event.url) {
		lines.push(`URL:${escapeIcsText(event.url)}`);
	}

	if (event.class) {
		lines.push(`CLASS:${event.class.toUpperCase()}`);
	}
}

/**
 * Generate recurrence properties
 */
function generateEventRecurrence(event: EventInput, lines: string[]): void {
	if (event.rrule) {
		lines.push(`RRULE:${event.rrule}`);
	}
}

/**
 * Generate geography and extension properties
 */
function generateEventExtensions(event: EventInput, lines: string[]): void {
	if (
		event.geoLatitude !== null &&
		event.geoLatitude !== undefined &&
		event.geoLongitude !== null &&
		event.geoLongitude !== undefined
	) {
		lines.push(`GEO:${event.geoLatitude};${event.geoLongitude}`);
	}

	if (event.color) {
		lines.push(`COLOR:${event.color}`);
	}
}

/**
 * Generate organizer property
 */
function generateOrganizer(event: EventInput, lines: string[]): void {
	if (event.organizerEmail) {
		let organizerLine = "ORGANIZER";
		if (event.organizerName) {
			organizerLine += `;CN=${escapeIcsText(event.organizerName)}`;
		}
		organizerLine += `:mailto:${event.organizerEmail}`;
		lines.push(organizerLine);
	}
}

/**
 * Build attendee line parameters
 */
function buildAttendeeParams(
	attendee: NonNullable<EventInput["attendees"]>[0],
): string[] {
	const params: string[] = [];
	if (attendee.name) params.push(`CN=${escapeIcsText(attendee.name)}`);
	if (attendee.role) params.push(`ROLE=${attendee.role.toUpperCase()}`);
	if (attendee.status) params.push(`PARTSTAT=${attendee.status.toUpperCase()}`);
	if (attendee.rsvp) params.push("RSVP=TRUE");
	return params;
}

/**
 * Generate attendees
 */
function generateAttendees(event: EventInput, lines: string[]): void {
	if (!event.attendees?.length) return;

	for (const attendee of event.attendees) {
		const params = buildAttendeeParams(attendee);
		const paramsStr = params.length > 0 ? `;${params.join(";")}` : "";
		lines.push(`ATTENDEE${paramsStr}:mailto:${attendee.email}`);
	}
}

/**
 * Build trigger line for alarm
 */
function buildAlarmTriggerLine(trigger: string): string {
	const isAbsoluteTrigger = /^\d{8}T\d{6}/.test(trigger);
	return isAbsoluteTrigger
		? `TRIGGER;VALUE=DATE-TIME:${trigger}`
		: `TRIGGER:${trigger}`;
}

/**
 * Build alarm content lines (excluding BEGIN/END)
 */
function buildAlarmContentLines(alarm: ParsedAlarm): string[] {
	const alarmLines: string[] = [
		buildAlarmTriggerLine(alarm.trigger),
		`ACTION:${alarm.action.toUpperCase()}`,
	];
	if (alarm.summary) alarmLines.push(`SUMMARY:${escapeIcsText(alarm.summary)}`);
	if (alarm.description)
		alarmLines.push(`DESCRIPTION:${escapeIcsText(alarm.description)}`);
	if (alarm.duration) alarmLines.push(`DURATION:${alarm.duration}`);
	if (alarm.repeat != null) alarmLines.push(`REPEAT:${alarm.repeat}`);
	return alarmLines;
}

/**
 * Generate alarms (VALARM)
 */
function generateAlarms(
	alarms: ParsedAlarm[] | undefined,
	lines: string[],
): void {
	if (!alarms?.length) return;

	for (const alarm of alarms) {
		lines.push("BEGIN:VALARM");
		lines.push(...buildAlarmContentLines(alarm));
		lines.push("END:VALARM");
	}
}

/**
 * Generate a single VEVENT component
 */
function generateEvent(event: EventInput): string[] {
	const lines: string[] = [];

	lines.push("BEGIN:VEVENT");
	generateEventBasicProperties(event, lines);
	generateEventMetadata(event, lines);
	generateEventRecurrence(event, lines);
	generateEventExtensions(event, lines);
	generateOrganizer(event, lines);
	generateAttendees(event, lines);
	generateAlarms(event.alarms, lines);
	lines.push("END:VEVENT");

	return lines;
}

/**
 * Generate ICS file content from events
 * @param options - Generator options with calendar name and events
 * @returns ICS file content string
 */
export function generateIcsFile(options: GeneratorOptions): string {
	const { calendarName, events, prodId = DEFAULT_PROD_ID } = options;
	const lines: string[] = [];

	// Header
	lines.push("BEGIN:VCALENDAR");
	lines.push("VERSION:2.0");
	lines.push(`PRODID:${prodId}`);
	lines.push("CALSCALE:GREGORIAN");
	lines.push("METHOD:PUBLISH");
	lines.push(`X-WR-CALNAME:${escapeIcsText(calendarName)}`);

	// Add events
	for (const event of events) {
		lines.push(...generateEvent(event));
	}

	// Footer
	lines.push("END:VCALENDAR");

	return lines.join("\r\n");
}
