import { protectedProcedure, publicProcedure, router } from "../index";
import { calendarRouter } from "./calendar";
import { eventRouter } from "./event";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	calendar: calendarRouter,
	event: eventRouter,
});
export type AppRouter = typeof appRouter;
