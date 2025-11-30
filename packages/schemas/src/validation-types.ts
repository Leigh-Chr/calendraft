/**
 * Type definitions for validation errors
 * Shared between frontend and backend
 */

export interface ValidationErrors {
	title?: string;
	startDate?: string;
	endDate?: string;
	dates?: string; // Legacy, use startDate/endDate for specific errors
	url?: string;
	organizerEmail?: string;
	attendeeEmails?: Record<number, string>;
	uid?: string;
	recurrenceId?: string;
	relatedTo?: string;
	geoLatitude?: string;
	geoLongitude?: string;
	alarms?: Record<
		number,
		{
			summary?: string;
			description?: string;
			trigger?: string;
		}
	>;
}
