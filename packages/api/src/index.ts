import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { logger } from "./lib/logger";

const isProduction = process.env["NODE_ENV"] === "production";

export const t = initTRPC.context<Context>().create({
	errorFormatter({ shape, error, ctx }) {
		// Log all errors with context (not just INTERNAL_SERVER_ERROR and BAD_REQUEST)
		// This helps with debugging and monitoring
		logger.error("tRPC Error", {
			code: error.code,
			message: error.message,
			path: shape.data?.path,
			userId: ctx?.userId,
			// Only include stack trace in development (too verbose in production)
			...(isProduction ? {} : { stack: error.stack }),
		});

		// In production, sanitize error responses to avoid exposing sensitive information
		if (isProduction) {
			if (error.code === "INTERNAL_SERVER_ERROR") {
				return {
					...shape,
					message: "An internal error occurred",
					// Remove stack trace from production responses
					data: {
						...shape.data,
						stack: undefined,
					},
				};
			}
		}

		return shape;
	},
});

export const router = t.router;

/**
 * Public procedure - no authentication required
 * Use for truly public endpoints (health checks, etc.)
 */
export const publicProcedure = t.procedure;

/**
 * Authenticated or Anonymous procedure
 * Requires either a valid session OR an anonymous ID
 * Use for most endpoints that need user identification
 */
export const authOrAnonProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "User ID required. Please authenticate or provide anonymous ID.",
			cause: "No userId (neither session nor anonymous ID)",
		});
	}
	return next({
		ctx: {
			...ctx,
			// Narrow the type: userId is now guaranteed to be a string
			userId: ctx.userId,
		},
	});
});

/**
 * Protected procedure - requires authenticated session only
 * Use for endpoints that require a real user account (no anonymous access)
 */
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
