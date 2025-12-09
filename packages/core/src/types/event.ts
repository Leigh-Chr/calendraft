/**
 * Core event types for calendar management
 * Framework-agnostic type definitions
 */

// ----- Attendee Types -----

export interface AttendeeData {
	name?: string | undefined;
	email: string;
	role?: string | undefined;
	status?: string | undefined;
	rsvp?: boolean | undefined;
}

// ----- Alarm Types -----

export interface AlarmData {
	trigger: string;
	action: string;
	summary?: string | undefined;
	description?: string | undefined;
	duration?: string | undefined;
	repeat?: number | undefined;
}

// ----- Event Form Types -----

export interface EventFormData {
	title: string;
	startDate: string;
	endDate: string;
	description?: string | undefined;
	location?: string | undefined;

	// Basic metadata
	status?: string | undefined;
	priority?: number | undefined;
	categories?: string | undefined;
	url?: string | undefined;
	class?: string | undefined;
	resources?: string | undefined;
	transp?: string | undefined;

	// Recurrence
	rrule?: string | undefined;
	rdate?: string | undefined; // JSON array
	exdate?: string | undefined; // JSON array

	// Geography
	geoLatitude?: number | undefined;
	geoLongitude?: number | undefined;

	// Organizer
	organizerName?: string | undefined;
	organizerEmail?: string | undefined;

	// Additional properties (RFC 5545)
	uid?: string | undefined;
	recurrenceId?: string | undefined;
	relatedTo?: string | undefined;
	comment?: string | undefined;
	contact?: string | undefined;
	sequence?: number | undefined;

	// Extensions (RFC 7986)
	color?: string | undefined;

	// Relations
	attendees?: AttendeeData[] | undefined;
	alarms?: AlarmData[] | undefined;
}

// ----- Event Entity -----

export interface EventEntity {
	id: string;
	title: string;
	startDate: Date;
	endDate: Date;
	description?: string | null;
	location?: string | null;
	status?: string | null;
	priority?: number | null;
	categories?: string | null;
	url?: string | null;
	class?: string | null;
	rrule?: string | null;
	uid?: string | null;
	geoLatitude?: number | null;
	geoLongitude?: number | null;
	organizerName?: string | null;
	organizerEmail?: string | null;
	color?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// Note: Event status/class/transparency types are in constants/ics-enums.ts
// Use EventStatusValue, EventClassValue, EventTranspValue from there
