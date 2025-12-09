/**
 * Calendar group router - handles calendar group operations
 * Assembles CRUD and calendar management sub-routers
 */

import { router } from "../../index";
import { calendarGroupCalendarsRouter } from "./group/calendars";
import { calendarGroupCrudRouter } from "./group/crud";

export const calendarGroupRouter = router(
	Object.assign(
		{},
		// CRUD operations
		calendarGroupCrudRouter._def.record,
		// Calendar management operations
		calendarGroupCalendarsRouter._def.record,
	),
);
