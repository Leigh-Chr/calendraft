import { auth } from "@calendraft/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

/**
 * Validate anonymous ID format
 * Must match: anon-[a-zA-Z0-9_-]{21,64}
 * Allows both legacy (21 char) and new (32 char) IDs
 */
function isValidAnonymousId(id: string): boolean {
	const pattern = /^anon-[a-zA-Z0-9_-]{21,64}$/;
	return pattern.test(id);
}

export async function createContext({ context }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});

	// Support anonymous users via header
	// Validate format to prevent injection attacks
	const rawAnonymousId = context.req.header("x-anonymous-id");
	const anonymousId =
		rawAnonymousId && isValidAnonymousId(rawAnonymousId)
			? rawAnonymousId
			: null;

	// Extract correlation ID from header (set by correlationIdMiddleware)
	const correlationId = context.req.header("x-correlation-id");

	return {
		session,
		anonymousId,
		correlationId,
		// Use userId if authenticated, otherwise use anonymousId
		userId: session?.user?.id || anonymousId,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
