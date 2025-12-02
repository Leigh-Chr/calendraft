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
			message:
				"Identifiant utilisateur requis. Veuillez vous connecter ou fournir un identifiant anonyme.",
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
			message: "Authentification requise",
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
