/**
 * Main calendar router
 * Assembles all calendar-related sub-routers
 */

import { router } from "../index";
import { calendarCoreRouter } from "./calendar/core";
import { calendarGroupRouter } from "./calendar/group";
import { calendarImportExportRouter } from "./calendar/import-export";
import { calendarImportUrlRouter } from "./calendar/import-url";
import { calendarMergeDuplicatesRouter } from "./calendar/merge-duplicates";

export const calendarRouter = router(
	Object.assign(
		{},
		// Core CRUD operations
		calendarCoreRouter._def.record,
		// Import/Export operations
		calendarImportExportRouter._def.record,
		// Merge and duplicate operations
		calendarMergeDuplicatesRouter._def.record,
		// URL import operations
		calendarImportUrlRouter._def.record,
		// Group operations
		{ group: calendarGroupRouter },
	),
);

// Export cleanup utilities for use in jobs
export { cleanupOrphanedAnonymousCalendars } from "../lib/cleanup";
