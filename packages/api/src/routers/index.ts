import { protectedProcedure, publicProcedure, router } from "../index";
import { calendarRouter } from "./calendar";
import { eventRouter } from "./event";
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
	event: eventRouter,
	user: userRouter,
});
export type AppRouter = typeof appRouter;
