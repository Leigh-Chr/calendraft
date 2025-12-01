/**
 * Generate ICS file content from calendar events
 * Follows RFC 5545 specification
 */

export interface AttendeeData {
	name?: string | null;
	email: string;
	role?: string | null;
	status?: string | null;
	rsvp?: boolean;
}

export interface AlarmData {
	trigger: string;
	action: string;
	summary?: string | null;
	description?: string | null;
	duration?: string | null;
	repeat?: number | null;
}

export interface EventData {
	id: string;
	title: string;
	startDate: Date;
	endDate: Date;
	description?: string | null;
	location?: string | null;

	// Basic metadata
	status?: string | null;
	priority?: number | null;
	categories?: string | null; // Comma-separated
	url?: string | null;
	class?: string | null;
	comment?: string | null;
	contact?: string | null;
	resources?: string | null; // Comma-separated
	sequence?: number | null;
	transp?: string | null;

	// Recurrence
	rrule?: string | null;
	rdate?: string | null; // JSON array of dates
	exdate?: string | null; // JSON array of dates

	// Geography
	geoLatitude?: number | null;
	geoLongitude?: number | null;

	// Organizer
	organizerName?: string | null;
	organizerEmail?: string | null;

	// Additional properties (RFC 5545)
	uid?: string | null;
	dtstamp?: Date | null;
	created?: Date | null;
	lastModified?: Date | null;
	recurrenceId?: string | null;
	relatedTo?: string | null;

	// Extensions (RFC 7986)
	color?: string | null;

	// Relations
	attendees?: AttendeeData[];
	alarms?: AlarmData[];

	createdAt: Date;
	updatedAt: Date;
}

export interface CalendarData {
	name: string;
	events: EventData[];
}

/**
 * Escape text for ICS format (RFC 5545)
 */
function escapeIcsText(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "");
}

/**
 * Format date to ICS format (YYYYMMDDTHHmmssZ)
 */
function formatIcsDate(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const seconds = String(date.getUTCSeconds()).padStart(2, "0");

	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generate basic event properties (UID, DTSTAMP, dates, title, description, location)
 */
function generateEventBasicProperties(event: EventData, lines: string[]): void {
	const uid = event.uid || `${event.id}@calendraft`;
	lines.push(`UID:${uid}`);

	const dtstamp = event.dtstamp || event.createdAt;
	lines.push(`DTSTAMP:${formatIcsDate(dtstamp)}`);

	lines.push(`DTSTART:${formatIcsDate(event.startDate)}`);
	lines.push(`DTEND:${formatIcsDate(event.endDate)}`);

	if (event.title) {
		lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
	}

	if (event.description) {
		lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
	}

	if (event.location) {
		lines.push(`LOCATION:${escapeIcsText(event.location)}`);
	}

	const created = event.created || event.createdAt;
	lines.push(`CREATED:${formatIcsDate(created)}`);

	const lastModified = event.lastModified || event.updatedAt;
	lines.push(`LAST-MODIFIED:${formatIcsDate(lastModified)}`);
}

/**
 * Generate event metadata properties
 */
function generateEventMetadata(event: EventData, lines: string[]): void {
	if (event.status) {
		lines.push(`STATUS:${event.status.toUpperCase()}`);
	}

	if (event.priority !== null && event.priority !== undefined) {
		lines.push(`PRIORITY:${event.priority}`);
	}

	if (event.categories) {
		lines.push(`CATEGORIES:${escapeIcsText(event.categories)}`);
	}

	if (event.url) {
		lines.push(`URL:${escapeIcsText(event.url)}`);
	}

	if (event.class) {
		lines.push(`CLASS:${event.class.toUpperCase()}`);
	}

	if (event.comment) {
		lines.push(`COMMENT:${escapeIcsText(event.comment)}`);
	}

	if (event.contact) {
		lines.push(`CONTACT:${escapeIcsText(event.contact)}`);
	}

	if (event.resources) {
		lines.push(`RESOURCES:${escapeIcsText(event.resources)}`);
	}

	if (event.sequence !== null && event.sequence !== undefined) {
		lines.push(`SEQUENCE:${event.sequence}`);
	}

	if (event.transp) {
		lines.push(`TRANSP:${event.transp.toUpperCase()}`);
	}
}

/**
 * Generate recurrence properties (RRULE, RDATE, EXDATE)
 */
function generateEventRecurrence(event: EventData, lines: string[]): void {
	if (event.rrule) {
		lines.push(`RRULE:${event.rrule}`);
	}

	if (event.rdate) {
		try {
			const rdates = JSON.parse(event.rdate) as string[];
			if (Array.isArray(rdates) && rdates.length > 0) {
				const rdateStrings = rdates.map((d) => formatIcsDate(new Date(d)));
				lines.push(`RDATE:${rdateStrings.join(",")}`);
			}
		} catch {
			// If parsing fails, skip RDATE
		}
	}

	if (event.exdate) {
		try {
			const exdates = JSON.parse(event.exdate) as string[];
			if (Array.isArray(exdates) && exdates.length > 0) {
				const exdateStrings = exdates.map((d) => formatIcsDate(new Date(d)));
				lines.push(`EXDATE:${exdateStrings.join(",")}`);
			}
		} catch {
			// If parsing fails, skip EXDATE
		}
	}
}

/**
 * Generate geography and extension properties
 */
function generateEventExtensions(event: EventData, lines: string[]): void {
	if (
		event.geoLatitude !== null &&
		event.geoLatitude !== undefined &&
		event.geoLongitude !== null &&
		event.geoLongitude !== undefined
	) {
		lines.push(`GEO:${event.geoLatitude};${event.geoLongitude}`);
	}

	if (event.recurrenceId) {
		lines.push(`RECURRENCE-ID:${event.recurrenceId}`);
	}

	if (event.relatedTo) {
		lines.push(`RELATED-TO:${escapeIcsText(event.relatedTo)}`);
	}

	if (event.color) {
		lines.push(`COLOR:${event.color}`);
	}
}

/**
 * Generate organizer property
 */
function generateOrganizer(event: EventData, lines: string[]): void {
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
	attendee: NonNullable<EventData["attendees"]>[0],
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
function generateAttendees(event: EventData, lines: string[]): void {
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
function buildAlarmContentLines(
	alarm: NonNullable<EventData["alarms"]>[0],
): string[] {
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
function generateAlarms(event: EventData, lines: string[]): void {
	if (!event.alarms?.length) return;

	for (const alarm of event.alarms) {
		lines.push("BEGIN:VALARM");
		lines.push(...buildAlarmContentLines(alarm));
		lines.push("END:VALARM");
	}
}

/**
 * Generate ICS file content from calendar data
 */
export function generateIcs(calendar: CalendarData): string {
	const lines: string[] = [];

	// Header
	lines.push("BEGIN:VCALENDAR");
	lines.push("VERSION:2.0");
	lines.push("PRODID:-//Calendraft//Calendraft//EN");
	lines.push("CALSCALE:GREGORIAN");
	lines.push("METHOD:PUBLISH");

	// Add events
	for (const event of calendar.events) {
		lines.push("BEGIN:VEVENT");

		generateEventBasicProperties(event, lines);
		generateEventMetadata(event, lines);
		generateEventRecurrence(event, lines);
		generateEventExtensions(event, lines);
		generateOrganizer(event, lines);
		generateAttendees(event, lines);
		generateAlarms(event, lines);

		lines.push("END:VEVENT");
	}

	// Footer
	lines.push("END:VCALENDAR");

	return lines.join("\r\n");
}
