/**
 * Parse ICS file content and extract events
 * Based on RFC 5545 specification
 */

import ical from "ical.js";
import type {
	ParsedAlarm,
	ParsedAttendee,
	ParsedEvent,
	ParseResult,
} from "../types";

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
 * Extract recurrence data (RRULE, RDATE, EXDATE)
 */
function extractRecurrenceData(vevent: ical.Component) {
	// Extract RRULE
	const rruleProp = vevent.getFirstProperty("rrule");
	let rrule: string | undefined;
	if (rruleProp) {
		const rruleValue = rruleProp.getFirstValue();
		if (rruleValue) {
			if (rruleValue instanceof ical.Recur) {
				rrule = rruleValue.toString();
			} else if (typeof rruleValue === "object") {
				try {
					const recur = new ical.Recur(
						rruleValue as unknown as Record<string, string | number>,
					);
					rrule = recur.toString();
				} catch {
					rrule = String(rruleValue);
				}
			} else {
				rrule = String(rruleValue);
			}
		}
	}

	// Extract RDATE
	const rdateProps = vevent.getAllProperties("rdate");
	const rdate: Date[] = [];
	for (const rdateProp of rdateProps) {
		const rdateValue = rdateProp.getFirstValue();
		if (rdateValue) {
			if (rdateValue instanceof ical.Time) {
				rdate.push(rdateValue.toJSDate());
			} else if (Array.isArray(rdateValue)) {
				for (const dt of rdateValue) {
					if (dt instanceof ical.Time) {
						rdate.push(dt.toJSDate());
					}
				}
			}
		}
	}

	// Extract EXDATE
	const exdateProps = vevent.getAllProperties("exdate");
	const exdate: Date[] = [];
	for (const exdateProp of exdateProps) {
		const exdateValue = exdateProp.getFirstValue();
		if (exdateValue) {
			if (exdateValue instanceof ical.Time) {
				exdate.push(exdateValue.toJSDate());
			} else if (Array.isArray(exdateValue)) {
				for (const dt of exdateValue) {
					if (dt instanceof ical.Time) {
						exdate.push(dt.toJSDate());
					}
				}
			}
		}
	}

	return {
		rrule,
		rdate: rdate.length > 0 ? rdate : undefined,
		exdate: exdate.length > 0 ? exdate : undefined,
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
			const attendeeValue = attendeeProp.getFirstValue();
			if (typeof attendeeValue === "string") {
				let email: string | undefined;
				let name: string | undefined;

				const match = attendeeValue.match(/CN=([^:]+):mailto:(.+)/);
				if (match?.[2]) {
					name = match[1];
					email = match[2];
				} else if (attendeeValue.startsWith("mailto:")) {
					email = attendeeValue.replace("mailto:", "");
				} else {
					email = attendeeValue;
				}

				if (!email) continue;

				const cnParam = attendeeProp.getParameter("cn");
				if (cnParam && !name) {
					name = String(cnParam);
				}

				const roleParam = attendeeProp.getParameter("role");
				const role = roleParam ? String(roleParam) : undefined;

				const partstatParam = attendeeProp.getParameter("partstat");
				const status = partstatParam ? String(partstatParam) : undefined;

				const rsvpParam = attendeeProp.getParameter("rsvp");
				let rsvp = false;
				if (rsvpParam !== null && rsvpParam !== undefined) {
					if (typeof rsvpParam === "boolean") {
						rsvp = rsvpParam;
					} else if (typeof rsvpParam === "string") {
						rsvp = rsvpParam.toUpperCase() === "TRUE";
					}
				}

				attendees.push({ name, email, role, status, rsvp });
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
			const triggerProp = alarmComp.getFirstProperty("trigger");
			const actionProp = alarmComp.getFirstPropertyValue("action");

			if (!triggerProp || !actionProp) continue;

			const triggerValue = triggerProp.getFirstValue();
			let trigger = "";
			if (triggerValue instanceof ical.Duration) {
				trigger = triggerValue.toString();
			} else if (typeof triggerValue === "string") {
				trigger = triggerValue;
			} else if (triggerValue instanceof ical.Time) {
				trigger = triggerValue.toICALString();
			}

			const action = String(actionProp);
			const alarmSummary = alarmComp.getFirstPropertyValue("summary") as
				| string
				| undefined;
			const alarmDescription = alarmComp.getFirstPropertyValue("description") as
				| string
				| undefined;

			const durationProp = alarmComp.getFirstPropertyValue("duration");
			let duration: string | undefined;
			if (durationProp) {
				duration =
					durationProp instanceof ical.Duration
						? durationProp.toString()
						: String(durationProp);
			}

			const repeatProp = alarmComp.getFirstPropertyValue("repeat");
			const repeat =
				repeatProp !== null && repeatProp !== undefined
					? Number(repeatProp)
					: undefined;

			if (trigger && action) {
				alarms.push({
					trigger,
					action,
					summary: alarmSummary,
					description: alarmDescription,
					duration,
					repeat,
				});
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
 * Parse an ICS file content and extract events
 * @param fileContent - Raw ICS file content
 * @returns Parsed events and any parsing errors
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
				const event = new ical.Event(vevent);
				const summary = event.summary || "Untitled Event";
				const uid = vevent.getFirstPropertyValue("uid") as string | undefined;

				// Extract dates
				const dates = extractEventDates(event, vevent);
				if (!dates) {
					errors.push(
						`Event "${summary}" is missing start or end date, skipping.`,
					);
					continue;
				}

				// Extract all properties using helper functions
				const timestamps = extractTimestamps(vevent);
				const metadata = extractBasicMetadata(event, vevent);
				const recurrence = extractRecurrenceData(vevent);
				const geo = extractGeolocation(vevent);
				const organizer = extractOrganizer(vevent);
				const attendees = extractAttendees(vevent, summary, errors);
				const alarms = extractAlarms(vevent, summary, errors);

				// Extract additional simple properties
				const recurrenceId = vevent.getFirstPropertyValue("recurrence-id") as
					| string
					| undefined;
				const relatedTo = vevent.getFirstPropertyValue("related-to") as
					| string
					| undefined;
				const color = vevent.getFirstPropertyValue("color") as
					| string
					| undefined;

				const categoriesProp = vevent.getFirstPropertyValue("categories");
				const categories = extractArrayProperty(categoriesProp);

				const resourcesProp = vevent.getFirstPropertyValue("resources");
				const resources = extractArrayProperty(resourcesProp);

				events.push({
					title: summary,
					startDate: dates.startDate,
					endDate: dates.endDate,
					description: metadata.description,
					location: metadata.location,
					status: metadata.status,
					priority: metadata.priority,
					categories,
					url: metadata.url,
					class: metadata.classValue,
					comment: metadata.comment,
					contact: metadata.contact,
					resources,
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
					recurrenceId,
					relatedTo,
					color,
					attendees: attendees.length > 0 ? attendees : undefined,
					alarms: alarms.length > 0 ? alarms : undefined,
				});
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
