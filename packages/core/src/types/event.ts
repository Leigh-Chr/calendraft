/**
 * Core event types for calendar management
 * Framework-agnostic type definitions
 */

// ----- Attendee Types -----

export interface AttendeeData {
	name?: string;
	email: string;
	role?: string;
	status?: string;
	rsvp?: boolean;
}

// ----- Alarm Types -----

export interface AlarmData {
	trigger: string;
	action: string;
	summary?: string;
	description?: string;
	duration?: string;
	repeat?: number;
}

// ----- Event Form Types -----

export interface EventFormData {
	title: string;
	startDate: string;
	endDate: string;
	description?: string;
	location?: string;

	// Basic metadata
	status?: string;
	priority?: number;
	categories?: string;
	url?: string;
	class?: string;
	resources?: string;
	transp?: string;

	// Recurrence
	rrule?: string;
	rdate?: string; // JSON array
	exdate?: string; // JSON array

	// Geography
	geoLatitude?: number;
	geoLongitude?: number;

	// Organizer
	organizerName?: string;
	organizerEmail?: string;

	// Additional properties (RFC 5545)
	uid?: string;
	recurrenceId?: string;
	relatedTo?: string;
	comment?: string;
	contact?: string;
	sequence?: number;

	// Extensions (RFC 7986)
	color?: string;

	// Relations
	attendees?: AttendeeData[];
	alarms?: AlarmData[];
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
