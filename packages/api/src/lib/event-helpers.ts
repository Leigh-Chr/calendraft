type EventDataRecord = Record<
	string,
	string | number | Date | null | undefined
>;

/**
 * Helper to set a trimmed string value or null
 */
function setTrimmedString(
	data: EventDataRecord,
	key: string,
	value: string | null | undefined,
): void {
	if (value !== undefined) {
		data[key] = value?.trim() || null;
	}
}

/**
 * Helper to set a value as-is
 */
function setValue(data: EventDataRecord, key: string, value: unknown): void {
	if (value !== undefined) {
		data[key] = value;
	}
}

type EventInput = {
	title?: string;
	startDate?: Date;
	endDate?: Date;
	description?: string | null;
	location?: string | null;
	status?: string | null;
	priority?: number | null;
	url?: string | null;
	class?: string | null;
	comment?: string | null;
	contact?: string | null;
	sequence?: number | null;
	transp?: string | null;
	rrule?: string | null;
	geoLatitude?: number | null;
	geoLongitude?: number | null;
	organizerName?: string | null;
	organizerEmail?: string | null;
	uid?: string | null;
	recurrenceId?: string | null;
	relatedTo?: string | null;
	color?: string | null;
};

/**
 * Process string fields that need trimming
 */
function processStringFields(data: EventDataRecord, input: EventInput): void {
	const stringFields = [
		"title",
		"description",
		"location",
		"url",
		"comment",
		"contact",
		"rrule",
		"organizerName",
		"organizerEmail",
		"uid",
		"recurrenceId",
		"relatedTo",
		"color",
	] as const;

	for (const field of stringFields) {
		setTrimmedString(data, field, input[field]);
	}
}

/**
 * Process non-string fields
 */
function processNonStringFields(
	data: EventDataRecord,
	input: EventInput,
): void {
	setValue(data, "startDate", input.startDate);
	setValue(data, "endDate", input.endDate);
	setValue(data, "status", input.status);
	setValue(data, "priority", input.priority);
	setValue(data, "class", input.class);
	setValue(data, "transp", input.transp);
	setValue(data, "geoLatitude", input.geoLatitude);
	setValue(data, "geoLongitude", input.geoLongitude);

	if (input.sequence !== undefined) {
		data.sequence = input.sequence ?? 0;
	}
}

/**
 * Prepare event data for create/update operations
 * Handles sanitization and null conversion
 * Note: categories, resources, rdate, exdate are now handled separately via normalized tables
 */
export function prepareEventData(input: EventInput): EventDataRecord {
	const data: EventDataRecord = {};
	processStringFields(data, input);
	processNonStringFields(data, input);
	return data;
}

type AttendeeCreateData = {
	name: string | null;
	email: string;
	role: string | null;
	status: string | null;
	rsvp: boolean;
};

/**
 * Prepare attendee data for create/update operations
 */
export function prepareAttendeeData(
	attendees?: Array<{
		name?: string | null;
		email: string;
		role?: string | null;
		status?: string | null;
		rsvp?: boolean;
	}>,
): { create: Array<AttendeeCreateData> } | undefined {
	if (!attendees || attendees.length === 0) {
		return undefined;
	}

	return {
		create: attendees.map((a) => ({
			name: a.name?.trim() || null,
			email: a.email.trim(),
			role: a.role || null,
			status: a.status || null,
			rsvp: a.rsvp ?? false,
		})),
	};
}

type AlarmCreateData = {
	trigger: string;
	action: string;
	summary: string | null;
	description: string | null;
	duration: string | null;
	repeat: number | null;
};

/**
 * Prepare alarm data for create/update operations
 */
export function prepareAlarmData(
	alarms?: Array<{
		trigger: string;
		action: string;
		summary?: string | null;
		description?: string | null;
		duration?: string | null;
		repeat?: number | null;
	}>,
): { create: Array<AlarmCreateData> } | undefined {
	if (!alarms || alarms.length === 0) {
		return undefined;
	}

	return {
		create: alarms.map((a) => ({
			trigger: a.trigger,
			action: a.action,
			summary: a.summary?.trim() || null,
			description: a.description?.trim() || null,
			duration: a.duration || null,
			repeat: a.repeat ?? null,
		})),
	};
}

/**
 * Prepare categories data for normalized EventCategory table
 * Supports both string arrays and comma-separated strings for backward compatibility
 */
export function prepareCategoriesData(
	categories?: string[] | string | null,
): { create: Array<{ category: string }> } | undefined {
	if (!categories) return undefined;

	let categoryArray: string[];
	if (typeof categories === "string") {
		// Handle comma-separated string for backward compatibility
		categoryArray = categories
			.split(",")
			.map((c) => c.trim())
			.filter((c) => c.length > 0);
	} else {
		// Handle array
		categoryArray = categories.map((c) => c.trim()).filter((c) => c.length > 0);
	}

	if (categoryArray.length === 0) return undefined;

	// Remove duplicates
	const uniqueCategories = Array.from(new Set(categoryArray));

	return {
		create: uniqueCategories.map((category) => ({ category })),
	};
}

/**
 * Prepare resources data for normalized EventResource table
 * Supports both string arrays and comma-separated strings for backward compatibility
 */
export function prepareResourcesData(
	resources?: string[] | string | null,
): { create: Array<{ resource: string }> } | undefined {
	if (!resources) return undefined;

	let resourceArray: string[];
	if (typeof resources === "string") {
		// Handle comma-separated string for backward compatibility
		resourceArray = resources
			.split(",")
			.map((r) => r.trim())
			.filter((r) => r.length > 0);
	} else {
		// Handle array
		resourceArray = resources.map((r) => r.trim()).filter((r) => r.length > 0);
	}

	if (resourceArray.length === 0) return undefined;

	// Remove duplicates
	const uniqueResources = Array.from(new Set(resourceArray));

	return {
		create: uniqueResources.map((resource) => ({ resource })),
	};
}

/**
 * Parse date array from string or Date array
 */
function parseDateArray(dates: Date[] | string): Date[] {
	if (typeof dates === "string") {
		try {
			const parsed = JSON.parse(dates);
			return Array.isArray(parsed)
				? parsed.map((d: unknown) => new Date(d as string | number))
				: [];
		} catch {
			return [];
		}
	}
	return dates;
}

/**
 * Add dates to array with type
 */
function addDatesToArray(
	dates: Date[] | string | null | undefined,
	type: "RDATE" | "EXDATE",
	target: Array<{ date: Date; type: "RDATE" | "EXDATE" }>,
) {
	if (!dates) return;

	const dateArray = parseDateArray(dates);
	dateArray.forEach((date) => {
		if (date instanceof Date && !Number.isNaN(date.getTime())) {
			target.push({ date, type });
		}
	});
}

/**
 * Prepare recurrence dates data for normalized RecurrenceDate table
 * Handles both RDATE and EXDATE
 */
export function prepareRecurrenceDatesData(
	rdates?: Date[] | string | null,
	exdates?: Date[] | string | null,
): { create: Array<{ date: Date; type: "RDATE" | "EXDATE" }> } | undefined {
	const allDates: Array<{ date: Date; type: "RDATE" | "EXDATE" }> = [];

	addDatesToArray(rdates, "RDATE", allDates);
	addDatesToArray(exdates, "EXDATE", allDates);

	if (allDates.length === 0) return undefined;

	return { create: allDates };
}

/**
 * Convert string to EventStatus enum
 */
export function parseEventStatus(
	status?: string | null,
): "CONFIRMED" | "TENTATIVE" | "CANCELLED" | null {
	if (!status) return null;
	const upper = status.toUpperCase().trim();
	if (upper === "CONFIRMED" || upper === "TENTATIVE" || upper === "CANCELLED") {
		return upper;
	}
	return null;
}

/**
 * Convert string to EventClass enum
 */
export function parseEventClass(
	classValue?: string | null,
): "PUBLIC" | "PRIVATE" | "CONFIDENTIAL" | null {
	if (!classValue) return null;
	const upper = classValue.toUpperCase().trim();
	if (upper === "PUBLIC" || upper === "PRIVATE" || upper === "CONFIDENTIAL") {
		return upper;
	}
	return null;
}

/**
 * Convert string to EventTransparency enum
 */
export function parseEventTransparency(
	transp?: string | null,
): "OPAQUE" | "TRANSPARENT" | null {
	if (!transp) return null;
	const upper = transp.toUpperCase().trim();
	if (upper === "OPAQUE" || upper === "TRANSPARENT") {
		return upper;
	}
	return null;
}

/**
 * Convert string to AttendeeRole enum
 * Handles RFC 5545 format (REQ-PARTICIPANT) and Prisma format (REQ_PARTICIPANT)
 */
export function parseAttendeeRole(
	role?: string | null,
): "CHAIR" | "REQ_PARTICIPANT" | "OPT_PARTICIPANT" | "NON_PARTICIPANT" | null {
	if (!role) return null;
	const upper = role.toUpperCase().trim().replace(/-/g, "_");
	if (
		upper === "CHAIR" ||
		upper === "REQ_PARTICIPANT" ||
		upper === "OPT_PARTICIPANT" ||
		upper === "NON_PARTICIPANT"
	) {
		return upper;
	}
	return null;
}

/**
 * Convert string to AttendeeStatus enum
 * Handles RFC 5545 format (NEEDS-ACTION) and Prisma format (NEEDS_ACTION)
 */
export function parseAttendeeStatus(
	status?: string | null,
): "NEEDS_ACTION" | "ACCEPTED" | "DECLINED" | "TENTATIVE" | "DELEGATED" | null {
	if (!status) return null;
	const upper = status.toUpperCase().trim().replace(/-/g, "_");
	if (
		upper === "NEEDS_ACTION" ||
		upper === "ACCEPTED" ||
		upper === "DECLINED" ||
		upper === "TENTATIVE" ||
		upper === "DELEGATED"
	) {
		return upper;
	}
	return null;
}

/**
 * Convert string to AlarmAction enum
 */
export function parseAlarmAction(
	action?: string | null,
): "DISPLAY" | "EMAIL" | "AUDIO" | null {
	if (!action) return null;
	const upper = action.toUpperCase().trim();
	if (upper === "DISPLAY" || upper === "EMAIL" || upper === "AUDIO") {
		return upper;
	}
	return null;
}
