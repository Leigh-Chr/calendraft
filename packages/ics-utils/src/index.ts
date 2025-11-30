/**
 * @calendraft/ics-utils
 * Pure TypeScript utilities for parsing and generating ICS (iCalendar) files
 */

// Alarm utilities
export { formatAlarmTrigger, parseAlarmTrigger } from "./alarm";

// Date utilities
export {
	formatDateOnlyToICS,
	formatDateToICS,
	isValidIcsDate,
	parseDateFromICS,
} from "./date";

// Duration utilities
export {
	durationToMinutes,
	formatDuration,
	formatNegativeDuration,
	isValidDuration,
	parseDuration,
} from "./duration";
// Generator
export { escapeIcsText, generateIcsFile, unescapeIcsText } from "./generator";

// Parser
export { parseIcsFile } from "./parser";
// Types
export type {
	AlarmTrigger,
	AlarmWhen,
	DurationUnit,
	EventInput,
	GeneratorOptions,
	ParsedAlarm,
	ParsedAttendee,
	ParsedDuration,
	ParsedEvent,
	ParseResult,
} from "./types";
