/**
 * Type definitions for event form data
 */

export interface AttendeeFormData {
	name?: string;
	email: string;
	role?: string;
	status?: string;
	rsvp?: boolean;
}

export interface AlarmFormData {
	trigger: string;
	action: string;
	summary?: string;
	description?: string;
	duration?: string;
	repeat?: number;
}

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

	// Additional properties (RFC 5545) - Expert mode only
	uid?: string;
	recurrenceId?: string;
	relatedTo?: string;
	comment?: string; // Expert mode only
	contact?: string; // Expert mode only
	sequence?: number; // Expert mode only

	// Extensions (RFC 7986)
	color?: string; // Hex color format like #FF0000

	// Relations
	attendees?: AttendeeFormData[];
	alarms?: AlarmFormData[];
}
