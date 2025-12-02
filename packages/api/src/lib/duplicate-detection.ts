/**
 * Enhanced duplicate detection for calendar events
 *
 * Detection strategy:
 * 1. If both events have a UID, compare by UID (strongest identifier)
 * 2. Otherwise, compare by title + dates with configurable tolerance
 *
 * Date tolerance helps handle:
 * - Timezone conversion differences
 * - Minor sync variations between calendar apps
 * - Rounding differences in different systems
 */

/** Configuration for duplicate detection */
export interface DuplicateDetectionConfig {
	/** Tolerance in milliseconds for date comparison (default: 60000 = 1 minute) */
	dateTolerance?: number;
	/** Compare by UID when available (default: true) */
	useUid?: boolean;
	/** Compare by title in addition to dates (default: true) */
	useTitle?: boolean;
	/** Compare by location (default: false) */
	useLocation?: boolean;
}

const DEFAULT_CONFIG: Required<DuplicateDetectionConfig> = {
	dateTolerance: 60000, // 1 minute
	useUid: true,
	useTitle: true,
	useLocation: false,
};

/** Minimal event interface for duplicate detection */
export interface DuplicateCheckEvent {
	id: string;
	uid?: string | null;
	title: string;
	startDate: Date;
	endDate: Date;
	location?: string | null;
}

/**
 * Generate a comparison key for an event based on its properties
 * This key is used to group potentially duplicate events
 */
function generateEventKey(
	event: DuplicateCheckEvent,
	config: Required<DuplicateDetectionConfig>,
): string {
	// If UID is available and we're using it, it's the primary key
	if (config.useUid && event.uid) {
		return `uid:${event.uid}`;
	}

	// Otherwise, create a composite key
	const parts: string[] = [];

	if (config.useTitle) {
		// Normalize title: lowercase, trim, remove extra spaces
		parts.push(event.title.toLowerCase().trim().replace(/\s+/g, " "));
	}

	// Round dates to tolerance boundary for comparison
	const startBucket = Math.floor(
		event.startDate.getTime() / config.dateTolerance,
	);
	const endBucket = Math.floor(event.endDate.getTime() / config.dateTolerance);
	parts.push(`${startBucket}-${endBucket}`);

	if (config.useLocation && event.location) {
		parts.push(event.location.toLowerCase().trim());
	}

	return parts.join("|");
}

/**
 * Check if two events are duplicates based on the configuration
 */
export function areEventsDuplicates(
	event1: DuplicateCheckEvent,
	event2: DuplicateCheckEvent,
	config: DuplicateDetectionConfig = {},
): boolean {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };

	// If both have UIDs and we're using them, compare UIDs directly
	if (mergedConfig.useUid && event1.uid && event2.uid) {
		return event1.uid === event2.uid;
	}

	// Compare titles if configured
	if (mergedConfig.useTitle) {
		const title1 = event1.title.toLowerCase().trim().replace(/\s+/g, " ");
		const title2 = event2.title.toLowerCase().trim().replace(/\s+/g, " ");
		if (title1 !== title2) {
			return false;
		}
	}

	// Compare dates with tolerance
	const startDiff = Math.abs(
		event1.startDate.getTime() - event2.startDate.getTime(),
	);
	const endDiff = Math.abs(event1.endDate.getTime() - event2.endDate.getTime());

	if (
		startDiff > mergedConfig.dateTolerance ||
		endDiff > mergedConfig.dateTolerance
	) {
		return false;
	}

	// Compare location if configured
	if (mergedConfig.useLocation) {
		const loc1 = (event1.location || "").toLowerCase().trim();
		const loc2 = (event2.location || "").toLowerCase().trim();
		if (loc1 !== loc2) {
			return false;
		}
	}

	return true;
}

/**
 * Find and remove duplicates from an array of events
 * Returns the deduplicated array, keeping the first occurrence
 */
export function deduplicateEvents<T extends DuplicateCheckEvent>(
	events: T[],
	config: DuplicateDetectionConfig = {},
): { unique: T[]; duplicates: T[] } {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };
	const seen = new Map<string, T>();
	const duplicates: T[] = [];

	for (const event of events) {
		const key = generateEventKey(event, mergedConfig);

		const existing = seen.get(key);
		if (existing) {
			// Double-check with direct comparison to handle edge cases
			if (areEventsDuplicates(event, existing, config)) {
				duplicates.push(event);
				continue;
			}
		}

		seen.set(key, event);
	}

	return {
		unique: events.filter((e) => !duplicates.includes(e)),
		duplicates,
	};
}

/**
 * Find events in `newEvents` that are duplicates of events in `existingEvents`
 * Returns events from `newEvents` that should be skipped
 */
export function findDuplicatesAgainstExisting<T extends DuplicateCheckEvent>(
	newEvents: T[],
	existingEvents: DuplicateCheckEvent[],
	config: DuplicateDetectionConfig = {},
): { unique: T[]; duplicates: T[] } {
	const mergedConfig = { ...DEFAULT_CONFIG, ...config };
	const unique: T[] = [];
	const duplicates: T[] = [];

	// Build lookup for existing events
	const existingByKey = new Map<string, DuplicateCheckEvent[]>();
	for (const event of existingEvents) {
		const key = generateEventKey(event, mergedConfig);
		const existing = existingByKey.get(key) || [];
		existing.push(event);
		existingByKey.set(key, existing);
	}

	for (const newEvent of newEvents) {
		const key = generateEventKey(newEvent, mergedConfig);
		const potentialDuplicates = existingByKey.get(key) || [];

		const isDuplicate = potentialDuplicates.some((existing) =>
			areEventsDuplicates(newEvent, existing, config),
		);

		if (isDuplicate) {
			duplicates.push(newEvent);
		} else {
			unique.push(newEvent);
		}
	}

	return { unique, duplicates };
}

/**
 * Get duplicate IDs from an array of events
 * Returns IDs of events that should be removed (keeping first occurrence)
 */
export function getDuplicateIds(
	events: DuplicateCheckEvent[],
	config: DuplicateDetectionConfig = {},
): string[] {
	const { duplicates } = deduplicateEvents(events, config);
	return duplicates.map((e) => e.id);
}
