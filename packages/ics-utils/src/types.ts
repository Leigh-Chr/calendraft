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
	summary?: string;
	description?: string;
	duration?: string;
	repeat?: number;
}

// ----- Attendee Types -----

export interface ParsedAttendee {
	name?: string;
	email: string;
	role?: string;
	status?: string;
	rsvp?: boolean;
}

// ----- Event Types -----

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
