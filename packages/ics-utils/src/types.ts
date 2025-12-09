/**
 * Core types for ICS/iCalendar data structures
 * Based on RFC 5545 specifications
 */

// ----- Duration Types -----

export type DurationUnit = "minutes" | "hours" | "days" | "seconds";

export interface ParsedDuration {
	value: number;
	unit: DurationUnit;
}

// ----- Alarm Types -----

export type AlarmWhen = "before" | "at" | "after";

export interface AlarmTrigger {
	when: AlarmWhen;
	value: number;
	unit: Exclude<DurationUnit, "seconds">;
}

export interface ParsedAlarm {
	trigger: string;
	action: string;
	summary?: string | undefined;
	description?: string | undefined;
	duration?: string | undefined;
	repeat?: number | undefined;
}

// ----- Attendee Types -----

export interface ParsedAttendee {
	name?: string | undefined;
	email: string;
	role?: string | undefined;
	status?: string | undefined;
	rsvp?: boolean | undefined;
}

// ----- Event Types -----

export interface ParsedEvent {
	title: string;
	startDate: Date;
	endDate: Date;
	description?: string | undefined;
	location?: string | undefined;

	// Basic metadata
	status?: string | undefined;
	priority?: number | undefined;
	categories?: string[] | undefined;
	url?: string | undefined;
	class?: string | undefined;
	comment?: string | undefined;
	contact?: string | undefined;
	resources?: string[] | undefined;
	sequence?: number | undefined;
	transp?: string | undefined;

	// Recurrence
	rrule?: string | undefined;
	rdate?: Date[] | undefined;
	exdate?: Date[] | undefined;

	// Geography
	geoLatitude?: number | undefined;
	geoLongitude?: number | undefined;

	// Organizer
	organizerName?: string | undefined;
	organizerEmail?: string | undefined;

	// Additional properties (RFC 5545)
	uid?: string | undefined;
	dtstamp?: Date | undefined;
	created?: Date | undefined;
	lastModified?: Date | undefined;
	recurrenceId?: string | undefined;
	relatedTo?: string | undefined;

	// Extensions (RFC 7986)
	color?: string | undefined;

	// Relations
	attendees?: ParsedAttendee[] | undefined;
	alarms?: ParsedAlarm[] | undefined;
}

// ----- Parser Result -----

export interface ParseResult {
	events: ParsedEvent[];
	errors: string[];
}

// ----- Generator Types -----

export interface EventInput {
	title: string;
	startDate: Date;
	endDate: Date;
	description?: string;
	location?: string;
	status?: string;
	priority?: number;
	categories?: string[];
	url?: string;
	class?: string;
	rrule?: string;
	uid?: string;
	geoLatitude?: number;
	geoLongitude?: number;
	organizerName?: string;
	organizerEmail?: string;
	color?: string;
	attendees?: ParsedAttendee[];
	alarms?: ParsedAlarm[];
}

export interface GeneratorOptions {
	calendarName: string;
	events: EventInput[];
	prodId?: string;
}
