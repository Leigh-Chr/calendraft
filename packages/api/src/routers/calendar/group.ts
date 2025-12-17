/**
 * Calendar group router - handles calendar group operations
 * Assembles CRUD, calendar management, and members sub-routers
 */

import { router } from "../../index";
import { calendarGroupCalendarsRouter } from "./group/calendars";
import { calendarGroupCrudRouter } from "./group/crud";
import { calendarGroupMembersRouter } from "./group/members";

export const calendarGroupRouter = router(
	Object.assign(
		{},
		// CRUD operations
		calendarGroupCrudRouter._def.record,
		// Calendar management operations
		calendarGroupCalendarsRouter._def.record,
		// Member management operations
		calendarGroupMembersRouter._def.record,
	),
);
