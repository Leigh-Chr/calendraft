/**
 * Core calendar types
 */

import type { EventEntity } from "./event";

// ----- Calendar Entity -----

export interface CalendarEntity {
	id: string;
	name: string;
	description?: string | null;
	userId?: string | null;
	anonymousId?: string | null;
	createdAt: Date;
	updatedAt: Date;
	events?: EventEntity[];
}

// ----- Calendar Summary -----

export interface CalendarSummary {
	id: string;
	name: string;
	eventCount: number;
	createdAt: Date;
}
