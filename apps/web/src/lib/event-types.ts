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
	[key: string]: unknown;
}
