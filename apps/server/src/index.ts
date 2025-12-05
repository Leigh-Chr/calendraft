import "dotenv/config";
import { createContext } from "@calendraft/api/context";
import { appRouter } from "@calendraft/api/routers/index";
import { auth } from "@calendraft/auth";
import { trpcServer } from "@hono/trpc-server";
import * as Sentry from "@sentry/bun";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { z } from "zod";
import { startCleanupJob } from "./jobs/cleanup";
import { logger } from "./lib/logger";
import { authRateLimit, rateLimit } from "./middleware/rate-limit";

// Validate environment variables
const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).optional(),
	CORS_ORIGIN: z.string().min(1).optional(),
	BETTER_AUTH_SECRET: z.string().min(1).optional(),
	PORT: z.string().optional(),
	SENTRY_DSN: z.string().optional(),
});

const env = envSchema.parse(process.env);

// Initialize Sentry for error tracking and performance monitoring
// Must be initialized before any other imports to ensure proper auto-instrumentation
Sentry.init({
	dsn: env.SENTRY_DSN,
	environment: env.NODE_ENV || "development",
	enabled: !!env.SENTRY_DSN,

	// Disable PII collection by default for privacy
	sendDefaultPii: false,

	// Performance monitoring - adjust in production
	tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 1.0,

	// Filter sensitive data before sending to Sentry
	beforeSend(event) {
		// Remove any sensitive headers
		if (event.request?.headers) {
			const headers = event.request.headers as Record<
				string,
				string | undefined
			>;
			headers.authorization = undefined;
			headers.cookie = undefined;
			headers["x-anonymous-id"] = undefined;
		}

		// Remove any cookies from request
		if (event.request?.cookies) {
			event.request.cookies = {};
		}

		return event;
	},
});

// Check critical variables in production
const isProduction = env.NODE_ENV === "production";
if (isProduction) {
	if (!env.CORS_ORIGIN) {
		logger.error("CORS_ORIGIN is required in production");
		process.exit(1);
	}
	if (env.CORS_ORIGIN === "*") {
		logger.warn("CORS_ORIGIN is set to '*' in production. This is insecure.");
	}
	if (env.CORS_ORIGIN.includes("localhost")) {
		logger.warn(
			"CORS_ORIGIN contains 'localhost' in production. This may be incorrect.",
		);
	}
}

const app = new Hono();

// Use Hono's logger in development only
if (!isProduction) {
	app.use(honoLogger());
}

// Security headers - using Hono's built-in secure headers middleware
app.use(
	"/*",
	secureHeaders({
		// X-Frame-Options
		xFrameOptions: "DENY",
		// X-Content-Type-Options
		xContentTypeOptions: "nosniff",
		// Referrer-Policy
		referrerPolicy: "strict-origin-when-cross-origin",
		// Strict-Transport-Security (only sent over HTTPS)
		strictTransportSecurity: "max-age=31536000; includeSubDomains",
		// Permissions-Policy
		permissionsPolicy: {
			geolocation: [],
			microphone: [],
			camera: [],
		},
		// Content-Security-Policy for API
		contentSecurityPolicy: {
			defaultSrc: ["'none'"],
			frameAncestors: ["'none'"],
			baseUri: ["'none'"],
		},
	}),
);

// Rate limiting: 100 requests per minute for general routes
app.use("/*", rateLimit(100, 60000));

// CORS configuration
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN || "http://localhost:3001",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "x-anonymous-id"],
		credentials: true,
	}),
);

// CSRF protection for state-changing requests
// Uses Origin and Sec-Fetch-Site header validation
app.use(
	"/*",
	csrf({
		origin: env.CORS_ORIGIN || "http://localhost:3001",
	}),
);

// Strict rate limiting for auth endpoints (10 requests/minute)
app.use("/api/auth/*", authRateLimit());
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

// Health check endpoint with database verification
app.get("/health", async (c) => {
	try {
		// Check database connection
		const prisma = (await import("@calendraft/db")).default;
		await prisma.$queryRaw`SELECT 1`;

		return c.json(
			{ status: "healthy", timestamp: new Date().toISOString() },
			200,
		);
	} catch (error) {
		logger.error("Health check failed", error);
		Sentry.captureException(error);
		return c.json(
			{
				status: "unhealthy",
				error: "Database connection failed",
				timestamp: new Date().toISOString(),
			},
			503,
		);
	}
});

// Global error handler for uncaught exceptions
app.onError((err, c) => {
	Sentry.captureException(err);
	logger.error("Unhandled error", err);
	return c.json(
		{
			error: "Internal Server Error",
			timestamp: new Date().toISOString(),
		},
		500,
	);
});

const port = Number(env.PORT) || 3000;

// Start cleanup job for orphaned anonymous calendars
// Only in production to avoid cleaning up during development
if (isProduction) {
	startCleanupJob();
}

export default {
	port,
	fetch: app.fetch,
};

logger.info(`Server starting on http://localhost:${port}`);
