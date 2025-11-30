/**
 * Core utilities exports
 */

export {
	addDaysToDate,
	addHoursToDate,
	addMinutesToDate,
	endOfDay,
	formatDateShort,
	formatEventDuration,
	getDurationMinutes,
	isSameDay,
	isValidDate,
	normalizeDate,
	startOfDay,
	toDateTimeLocal,
} from "./date";
export { deepClone, deepEqual, shallowClone } from "./deep-equal";
export {
	initializeFormData,
	transformEventFormData,
} from "./form";
export {
	addTag,
	getLastTag,
	hasTag,
	parseTags,
	removeTag,
	stringifyTags,
} from "./tags";
