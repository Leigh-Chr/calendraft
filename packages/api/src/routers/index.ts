import { protectedProcedure, publicProcedure, router } from "../index";
import { calendarRouter } from "./calendar";
import { dashboardRouter } from "./dashboard";
import { eventRouter } from "./event";
import { shareRouter } from "./share";
import { userRouter } from "./user";

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
	dashboard: dashboardRouter,
	event: eventRouter,
	share: shareRouter,
	user: userRouter,
});
export type AppRouter = typeof appRouter;
