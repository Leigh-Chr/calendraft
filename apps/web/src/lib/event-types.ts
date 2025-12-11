/**
 * Type definitions for event data from the API
 */

export interface EventListItem {
	id: string;
	title: string;
	startDate: string | Date;
	endDate: string | Date;
	description?: string | null;
	location?: string | null;
	uid?: string | null;
	// Restrict index signature to allowed types only
	[key: string]: string | Date | null | undefined;
}
