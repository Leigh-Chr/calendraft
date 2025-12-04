import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../index";
import { getUserUsage } from "../middleware";

export const userRouter = router({
	/**
	 * Get current user's usage information
	 * Authenticated users have generous limits (100 calendars, 2000 events)
	 */
	getUsage: protectedProcedure.query(async ({ ctx }) => {
		const usage = await getUserUsage(ctx);
		if (!usage) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Unable to fetch usage statistics",
			});
		}

		return {
			isAuthenticated: usage.isAuthenticated,
			usage: {
				calendarCount: usage.calendarCount,
				maxCalendars: usage.maxCalendars,
				maxEventsPerCalendar: usage.maxEventsPerCalendar,
			},
		};
	}),
});
