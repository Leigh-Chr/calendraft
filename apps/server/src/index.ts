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
import {
	authRateLimit,
	rateLimit,
	signupRateLimit,
} from "./middleware/rate-limit";

// Validate environment variables
const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).optional(),
	CORS_ORIGIN: z.string().min(1).optional(),
	BETTER_AUTH_SECRET: z.string().min(1).optional(),
	PORT: z.string().optional(),
	SENTRY_DSN: z.string().optional(),
	// Email configuration
	RESEND_API_KEY: z.string().optional(),
	EMAIL_FROM: z.string().optional(),
	// SMTP (alternative)
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.string().optional(),
	SMTP_SECURE: z.string().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASSWORD: z.string().optional(),
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
		if (event.request?.headers && typeof event.request.headers === "object") {
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

// CORS configuration - apply FIRST before security headers
// This ensures CORS preflight requests are handled correctly
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN || "http://localhost:3001",
		allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"x-anonymous-id",
			"Cookie",
			"Set-Cookie",
			"User-Agent",
			"Accept",
			"Accept-Language",
			"Accept-Encoding",
		],
		credentials: true,
		exposeHeaders: ["Set-Cookie"],
	}),
);

// Security headers - using Hono's built-in secure headers middleware
// Exclude auth endpoints from restrictive cross-origin policies
app.use(async (c, next) => {
	// For auth endpoints, use less restrictive headers to allow cross-origin requests
	if (c.req.path.startsWith("/api/auth/")) {
		return secureHeaders({
			xFrameOptions: "DENY",
			xContentTypeOptions: "nosniff",
			referrerPolicy: "strict-origin-when-cross-origin",
			strictTransportSecurity: "max-age=31536000; includeSubDomains",
			permissionsPolicy: {
				geolocation: [],
				microphone: [],
				camera: [],
			},
			contentSecurityPolicy: {
				defaultSrc: ["'none'"],
				frameAncestors: ["'none'"],
				baseUri: ["'none'"],
			},
			// Allow cross-origin requests for auth endpoints
			crossOriginResourcePolicy: "cross-origin",
			crossOriginOpenerPolicy: "same-origin-allow-popups",
		})(c, next);
	}
	// For other endpoints, use default restrictive headers
	return secureHeaders({
		xFrameOptions: "DENY",
		xContentTypeOptions: "nosniff",
		referrerPolicy: "strict-origin-when-cross-origin",
		strictTransportSecurity: "max-age=31536000; includeSubDomains",
		permissionsPolicy: {
			geolocation: [],
			microphone: [],
			camera: [],
		},
		contentSecurityPolicy: {
			defaultSrc: ["'none'"],
			frameAncestors: ["'none'"],
			baseUri: ["'none'"],
		},
	})(c, next);
});

// Rate limiting: 100 requests per minute for general routes
// Exclude auth endpoints as they have their own rate limiting
app.use(async (c, next) => {
	if (c.req.path.startsWith("/api/auth/")) {
		return next();
	}
	return rateLimit(100, 60000)(c, next);
});

// CSRF protection for state-changing requests
// Uses Origin and Sec-Fetch-Site header validation
// Exclude auth endpoints as Better-Auth handles CSRF internally
app.use(async (c, next) => {
	// Skip CSRF for auth endpoints (Better-Auth handles it)
	if (c.req.path.startsWith("/api/auth/")) {
		return next();
	}
	// Apply CSRF to all other routes
	return csrf({
		origin: env.CORS_ORIGIN || "http://localhost:3001",
	})(c, next);
});

// Rate limiting spécifique pour les inscriptions (5 par minute)
// IMPORTANT: Doit être appliqué AVANT le rate limit général et AVANT le handler Better-Auth
app.use("/api/auth/sign-up/email", signupRateLimit());

// Rate limiting général pour les autres endpoints auth (10 par minute)
app.use("/api/auth/*", authRateLimit());

// Better-Auth handler pour les endpoints auth (tous les méthodes)
// CORS is already handled by the global middleware above
app.all("/api/auth/*", async (c) => {
	const response = await auth.handler(c.req.raw);
	return response;
});

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
