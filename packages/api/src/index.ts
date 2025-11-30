import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create({
	errorFormatter({ shape, error, ctx }) {
		// Log errors with context
		if (
			error.code === "INTERNAL_SERVER_ERROR" ||
			error.code === "BAD_REQUEST"
		) {
			console.error("❌ tRPC Error:", {
				code: error.code,
				message: error.message,
				path: shape.data?.path,
				userId: ctx?.userId,
				stack: error.stack,
			});
		}
		return shape;
	},
});

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
			cause: "No session",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});
