import ical from "ical.js";

export interface ParsedAttendee {
	name?: string;
	email: string;
	role?: string;
	status?: string;
	rsvp?: boolean;
}

export interface ParsedAlarm {
	trigger: string;
	action: string;
	summary?: string;
	description?: string;
	duration?: string;
	repeat?: number;
}

export interface ParsedEvent {
	title: string;
	startDate: Date;
	endDate: Date;
	description?: string;
	location?: string;

	// Basic metadata
	status?: string;
	priority?: number;
	categories?: string[];
	url?: string;
	class?: string;
	comment?: string;
	contact?: string;
	resources?: string[];
	sequence?: number;
	transp?: string;

	// Recurrence
	rrule?: string;
	rdate?: Date[];
	exdate?: Date[];

	// Geography
	geoLatitude?: number;
	geoLongitude?: number;

	// Organizer
	organizerName?: string;
	organizerEmail?: string;

	// Additional properties (RFC 5545)
	uid?: string;
	dtstamp?: Date;
	created?: Date;
	lastModified?: Date;
	recurrenceId?: string;
	relatedTo?: string;

	// Extensions (RFC 7986)
	color?: string;

	// Relations
	attendees?: ParsedAttendee[];
	alarms?: ParsedAlarm[];
}

export interface ParseResult {
	events: ParsedEvent[];
	errors: string[];
}

/**
 * Extract event dates and handle DURATION as alternative to DTEND
 */
function extractEventDates(
	event: ical.Event,
	vevent: ical.Component,
): { startDate: Date; endDate: Date } | null {
	const startDate = event.startDate?.toJSDate();
	let endDate = event.endDate?.toJSDate();

	// Handle DURATION as alternative to DTEND
	if (!endDate) {
		const durationProp = vevent.getFirstPropertyValue("duration");
		if (durationProp && startDate) {
			try {
				let duration: ical.Duration;
				if (durationProp instanceof ical.Duration) {
					duration = durationProp;
				} else if (typeof durationProp === "string") {
					duration = ical.Duration.fromString(durationProp);
				} else {
					duration = new ical.Duration(
						durationProp as unknown as Record<string, number>,
					);
				}
				endDate = new Date(startDate.getTime() + duration.toSeconds() * 1000);
			} catch {
				// If duration parsing fails, return null
			}
		}
	}

	if (!startDate || !endDate) {
		return null;
	}

	return { startDate, endDate };
}

/**
 * Extract timestamp-related properties
 */
function extractTimestamps(vevent: ical.Component) {
	const dtstampProp = vevent.getFirstPropertyValue("dtstamp");
	const dtstamp =
		dtstampProp instanceof ical.Time ? dtstampProp.toJSDate() : undefined;

	const createdProp = vevent.getFirstPropertyValue("created");
	const created =
		createdProp instanceof ical.Time ? createdProp.toJSDate() : undefined;

	const lastModifiedProp = vevent.getFirstPropertyValue("last-modified");
	const lastModified =
		lastModifiedProp instanceof ical.Time
			? lastModifiedProp.toJSDate()
			: undefined;

	return { dtstamp, created, lastModified };
}

/**
 * Extract basic event metadata
 */
function extractBasicMetadata(event: ical.Event, vevent: ical.Component) {
	const description = event.description || undefined;
	const location = event.location || undefined;
	const status = vevent.getFirstPropertyValue("status") as string | undefined;

	const priorityProp = vevent.getFirstPropertyValue("priority");
	const priority =
		priorityProp !== null && priorityProp !== undefined
			? Number(priorityProp)
			: undefined;

	const url = vevent.getFirstPropertyValue("url") as string | undefined;

	const classProp = vevent.getFirstPropertyValue("class");
	const classValue = classProp ? String(classProp).toUpperCase() : undefined;

	const comment = vevent.getFirstPropertyValue("comment") as string | undefined;
	const contact = vevent.getFirstPropertyValue("contact") as string | undefined;

	const sequenceProp = vevent.getFirstPropertyValue("sequence");
	const sequence =
		sequenceProp !== null && sequenceProp !== undefined
			? Number(sequenceProp)
			: undefined;

	const transp = vevent.getFirstPropertyValue("transp") as string | undefined;

	return {
		description,
		location,
		status,
		priority,
		url,
		classValue,
		comment,
		contact,
		sequence,
		transp,
	};
}

/**
 * Extract array-based properties (categories, resources)
 */
function extractArrayProperty(value: unknown): string[] | undefined {
	if (!value) return undefined;

	if (Array.isArray(value)) {
		return value.map((c) => String(c));
	}
	return String(value)
		.split(",")
		.map((c) => c.trim());
}

/**
 * Parse RRULE value from various formats
 */
function parseRRuleValue(rruleValue: unknown): string | undefined {
	if (!rruleValue) return undefined;

	if (rruleValue instanceof ical.Recur) {
		return rruleValue.toString();
	}

	if (typeof rruleValue === "object") {
		try {
			const recur = new ical.Recur(
				rruleValue as unknown as Record<string, string | number>,
			);
			return recur.toString();
		} catch {
			return String(rruleValue);
		}
	}

	return String(rruleValue);
}

/**
 * Extract RRULE from vevent
 */
function extractRRule(vevent: ical.Component): string | undefined {
	const rruleProp = vevent.getFirstProperty("rrule");
	if (!rruleProp) return undefined;

	return parseRRuleValue(rruleProp.getFirstValue());
}

/**
 * Parse a date value that could be ical.Time or an array of ical.Time
 */
function parseDateValue(value: unknown): Date[] {
	if (!value) return [];

	if (value instanceof ical.Time) {
		return [value.toJSDate()];
	}

	if (Array.isArray(value)) {
		return value
			.filter((dt): dt is ical.Time => dt instanceof ical.Time)
			.map((dt) => dt.toJSDate());
	}

	return [];
}

/**
 * Extract a list of dates from a property (RDATE or EXDATE)
 */
function extractDateList(
	vevent: ical.Component,
	propertyName: string,
): Date[] | undefined {
	const props = vevent.getAllProperties(propertyName);
	const dates: Date[] = [];

	for (const prop of props) {
		const parsedDates = parseDateValue(prop.getFirstValue());
		dates.push(...parsedDates);
	}

	return dates.length > 0 ? dates : undefined;
}

/**
 * Extract recurrence data (RRULE, RDATE, EXDATE)
 */
function extractRecurrenceData(vevent: ical.Component) {
	return {
		rrule: extractRRule(vevent),
		rdate: extractDateList(vevent, "rdate"),
		exdate: extractDateList(vevent, "exdate"),
	};
}

/**
 * Extract geolocation data
 */
function extractGeolocation(vevent: ical.Component) {
	const geoProp = vevent.getFirstPropertyValue("geo");
	let geoLatitude: number | undefined;
	let geoLongitude: number | undefined;

	if (geoProp) {
		if (typeof geoProp === "object" && "lat" in geoProp && "lon" in geoProp) {
			const geoObject = geoProp as {
				lat: number | string;
				lon: number | string;
			};
			geoLatitude = Number(geoObject.lat);
			geoLongitude = Number(geoObject.lon);
		} else if (typeof geoProp === "string") {
			const parts = geoProp.split(";");
			if (parts.length === 2) {
				geoLatitude = Number(parts[0]);
				geoLongitude = Number(parts[1]);
			}
		}
	}

	return { geoLatitude, geoLongitude };
}

/**
 * Extract organizer information
 */
function extractOrganizer(vevent: ical.Component) {
	const organizerProp = vevent.getFirstProperty("organizer");
	let organizerName: string | undefined;
	let organizerEmail: string | undefined;

	if (organizerProp) {
		const organizerValue = organizerProp.getFirstValue();
		if (typeof organizerValue === "string") {
			const match = organizerValue.match(/CN=([^:]+):mailto:(.+)/);
			if (match) {
				organizerName = match[1];
				organizerEmail = match[2];
			} else if (organizerValue.startsWith("mailto:")) {
				organizerEmail = organizerValue.replace("mailto:", "");
			} else {
				organizerEmail = organizerValue;
			}
		}
		const cnParam = organizerProp.getParameter("cn");
		if (cnParam) {
			organizerName = String(cnParam);
		}
	}

	return { organizerName, organizerEmail };
}

/**
 * Parse email and name from attendee value string
 */
function parseAttendeeEmailAndName(value: string): {
	email: string | undefined;
	name: string | undefined;
} {
	const match = value.match(/CN=([^:]+):mailto:(.+)/);
	if (match?.[2]) {
		return { name: match[1], email: match[2] };
	}

	if (value.startsWith("mailto:")) {
		return { email: value.replace("mailto:", ""), name: undefined };
	}

	return { email: value, name: undefined };
}

/**
 * Parse RSVP parameter value
 */
function parseRsvpParam(rsvpParam: unknown): boolean {
	if (rsvpParam === null || rsvpParam === undefined) return false;
	if (typeof rsvpParam === "boolean") return rsvpParam;
	if (typeof rsvpParam === "string") return rsvpParam.toUpperCase() === "TRUE";
	return false;
}

/**
 * Parse a single attendee property
 */
function parseAttendeeProp(attendeeProp: ical.Property): ParsedAttendee | null {
	const attendeeValue = attendeeProp.getFirstValue();
	if (typeof attendeeValue !== "string") return null;

	const { email, name: parsedName } = parseAttendeeEmailAndName(attendeeValue);
	if (!email) return null;

	const cnParam = attendeeProp.getParameter("cn");
	const name = parsedName ?? (cnParam ? String(cnParam) : undefined);

	const roleParam = attendeeProp.getParameter("role");
	const role = roleParam ? String(roleParam) : undefined;

	const partstatParam = attendeeProp.getParameter("partstat");
	const status = partstatParam ? String(partstatParam) : undefined;

	const rsvp = parseRsvpParam(attendeeProp.getParameter("rsvp"));

	return { name, email, role, status, rsvp };
}

/**
 * Extract attendees
 */
function extractAttendees(
	vevent: ical.Component,
	summary: string,
	errors: string[],
): ParsedAttendee[] {
	const attendeeProps = vevent.getAllProperties("attendee");
	const attendees: ParsedAttendee[] = [];

	for (const attendeeProp of attendeeProps) {
		try {
			const attendee = parseAttendeeProp(attendeeProp);
			if (attendee) {
				attendees.push(attendee);
			}
		} catch (err) {
			errors.push(
				`Failed to parse attendee in event "${summary}": ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	return attendees;
}

/**
 * Parse alarm trigger value from various formats
 */
function parseAlarmTrigger(triggerValue: unknown): string {
	if (triggerValue instanceof ical.Duration) {
		return triggerValue.toString();
	}
	if (typeof triggerValue === "string") {
		return triggerValue;
	}
	if (triggerValue instanceof ical.Time) {
		return triggerValue.toICALString();
	}
	return "";
}

/**
 * Parse duration value from various formats
 */
function parseDurationValue(durationProp: unknown): string | undefined {
	if (!durationProp) return undefined;
	return durationProp instanceof ical.Duration
		? durationProp.toString()
		: String(durationProp);
}

/**
 * Parse a single alarm component
 */
function parseAlarmComponent(alarmComp: ical.Component): ParsedAlarm | null {
	const triggerProp = alarmComp.getFirstProperty("trigger");
	const actionProp = alarmComp.getFirstPropertyValue("action");

	if (!triggerProp || !actionProp) return null;

	const trigger = parseAlarmTrigger(triggerProp.getFirstValue());
	if (!trigger) return null;

	const repeatProp = alarmComp.getFirstPropertyValue("repeat");

	return {
		trigger,
		action: String(actionProp),
		summary: alarmComp.getFirstPropertyValue("summary") as string | undefined,
		description: alarmComp.getFirstPropertyValue("description") as
			| string
			| undefined,
		duration: parseDurationValue(alarmComp.getFirstPropertyValue("duration")),
		repeat:
			repeatProp !== null && repeatProp !== undefined
				? Number(repeatProp)
				: undefined,
	};
}

/**
 * Extract alarms (VALARM)
 */
function extractAlarms(
	vevent: ical.Component,
	summary: string,
	errors: string[],
): ParsedAlarm[] {
	const alarmComponents = vevent.getAllSubcomponents("valarm");
	const alarms: ParsedAlarm[] = [];

	for (const alarmComp of alarmComponents) {
		try {
			const alarm = parseAlarmComponent(alarmComp);
			if (alarm) {
				alarms.push(alarm);
			}
		} catch (err) {
			errors.push(
				`Failed to parse alarm in event "${summary}": ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	return alarms;
}

/**
 * Extract additional simple properties from vevent
 */
function extractSimpleProperties(vevent: ical.Component) {
	return {
		recurrenceId: vevent.getFirstPropertyValue("recurrence-id") as
			| string
			| undefined,
		relatedTo: vevent.getFirstPropertyValue("related-to") as string | undefined,
		color: vevent.getFirstPropertyValue("color") as string | undefined,
		categories: extractArrayProperty(
			vevent.getFirstPropertyValue("categories"),
		),
		resources: extractArrayProperty(vevent.getFirstPropertyValue("resources")),
	};
}

/**
 * Build a ParsedEvent from all extracted properties
 */
function buildParsedEvent(
	summary: string,
	uid: string | undefined,
	dates: { startDate: Date; endDate: Date },
	timestamps: ReturnType<typeof extractTimestamps>,
	metadata: ReturnType<typeof extractBasicMetadata>,
	recurrence: ReturnType<typeof extractRecurrenceData>,
	geo: ReturnType<typeof extractGeolocation>,
	organizer: ReturnType<typeof extractOrganizer>,
	simpleProps: ReturnType<typeof extractSimpleProperties>,
	attendees: ParsedAttendee[],
	alarms: ParsedAlarm[],
): ParsedEvent {
	return {
		title: summary,
		startDate: dates.startDate,
		endDate: dates.endDate,
		description: metadata.description,
		location: metadata.location,
		status: metadata.status,
		priority: metadata.priority,
		categories: simpleProps.categories,
		url: metadata.url,
		class: metadata.classValue,
		comment: metadata.comment,
		contact: metadata.contact,
		resources: simpleProps.resources,
		sequence: metadata.sequence,
		transp: metadata.transp,
		rrule: recurrence.rrule,
		rdate: recurrence.rdate,
		exdate: recurrence.exdate,
		geoLatitude: geo.geoLatitude,
		geoLongitude: geo.geoLongitude,
		organizerName: organizer.organizerName,
		organizerEmail: organizer.organizerEmail,
		uid,
		dtstamp: timestamps.dtstamp,
		created: timestamps.created,
		lastModified: timestamps.lastModified,
		recurrenceId: simpleProps.recurrenceId,
		relatedTo: simpleProps.relatedTo,
		color: simpleProps.color,
		attendees: attendees.length > 0 ? attendees : undefined,
		alarms: alarms.length > 0 ? alarms : undefined,
	};
}

/**
 * Parse a single vevent component into a ParsedEvent
 */
function parseVEvent(
	vevent: ical.Component,
	errors: string[],
): ParsedEvent | null {
	const event = new ical.Event(vevent);
	const summary = event.summary || "Untitled Event";
	const uid = vevent.getFirstPropertyValue("uid") as string | undefined;

	const dates = extractEventDates(event, vevent);
	if (!dates) {
		errors.push(`Event "${summary}" is missing start or end date, skipping.`);
		return null;
	}

	return buildParsedEvent(
		summary,
		uid,
		dates,
		extractTimestamps(vevent),
		extractBasicMetadata(event, vevent),
		extractRecurrenceData(vevent),
		extractGeolocation(vevent),
		extractOrganizer(vevent),
		extractSimpleProperties(vevent),
		extractAttendees(vevent, summary, errors),
		extractAlarms(vevent, summary, errors),
	);
}

/**
 * Parse an ICS file content and extract events
 */
export function parseIcsFile(fileContent: string): ParseResult {
	const events: ParsedEvent[] = [];
	const errors: string[] = [];

	try {
		const jcalData = ical.parse(fileContent);
		const comp = new ical.Component(jcalData);
		const vevents = comp.getAllSubcomponents("vevent");

		for (const vevent of vevents) {
			try {
				const parsedEvent = parseVEvent(vevent, errors);
				if (parsedEvent) {
					events.push(parsedEvent);
				}
			} catch (error) {
				errors.push(
					`Failed to parse event: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		if (vevents.length === 0) {
			errors.push("No events found in the ICS file.");
		}
	} catch (error) {
		errors.push(
			`Failed to parse ICS file: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return { events, errors };
}
