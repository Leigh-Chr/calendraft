import { auth } from "@calendraft/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});

	// Support anonymous users via header
	const anonymousId = context.req.header("x-anonymous-id") || null;

	return {
		session,
		anonymousId,
		// Use userId if authenticated, otherwise use anonymousId
		userId: session?.user?.id || anonymousId,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
