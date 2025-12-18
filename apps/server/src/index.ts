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
	getRequiredSecret,
	getSecret,
	isUsingDockerSecrets,
} from "./lib/secrets";
import {
	authRateLimit,
	changePasswordRateLimit,
	deleteAccountRateLimit,
	emailVerificationResendRateLimit,
	passwordResetRequestRateLimit,
	rateLimit,
	signupRateLimit,
	updateProfileRateLimit,
} from "./middleware/rate-limit";

// Validate environment variables
// Use Docker secrets helper for sensitive values (with fallback to env vars)
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

// Read secrets from Docker secrets or environment variables
// This allows gradual migration to Docker secrets without breaking existing deployments
const rawEnv = {
	...process.env,
	// Override with Docker secrets if available (more secure)
	BETTER_AUTH_SECRET:
		getSecret("BETTER_AUTH_SECRET") || process.env["BETTER_AUTH_SECRET"],
	RESEND_API_KEY: getSecret("RESEND_API_KEY") || process.env["RESEND_API_KEY"],
	SMTP_PASSWORD: getSecret("SMTP_PASSWORD") || process.env["SMTP_PASSWORD"],
};

const env = envSchema.parse(rawEnv);

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
			headers["authorization"] = undefined;
			headers["cookie"] = undefined;
			headers["x-anonymous-id"] = undefined;
		}

		// Remove any cookies from request
		if (event.request?.cookies) {
			event.request.cookies = {};
		}

		return event;
	},
});

// Log which secret management method is being used
if (isUsingDockerSecrets()) {
	logger.info("Using Docker secrets for sensitive configuration");
} else {
	logger.info("Using environment variables for configuration");
}

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
	// BETTER_AUTH_SECRET is required in production
	if (!env.BETTER_AUTH_SECRET) {
		logger.error(
			"BETTER_AUTH_SECRET is required in production. Set it via Docker secret or environment variable.",
		);
		// Try to get it with getRequiredSecret to show helpful error
		try {
			getRequiredSecret("BETTER_AUTH_SECRET");
		} catch {
			// Error already logged by getRequiredSecret
		}
		process.exit(1);
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
			// Sentry distributed tracing headers
			"baggage",
			"sentry-trace",
		],
		credentials: true,
		exposeHeaders: ["Set-Cookie"],
	}),
);

// Security headers - using Hono's built-in secure headers middleware
// Exclude auth endpoints from restrictive cross-origin policies
// Note: HSTS preload requires domain submission to hstspreload.org
app.use(async (c, next) => {
	// Extended Permissions-Policy for all endpoints
	const extendedPermissionsPolicy = {
		geolocation: [],
		microphone: [],
		camera: [],
		payment: [],
		usb: [],
		accelerometer: [],
		gyroscope: [],
		magnetometer: [],
	};

	// For auth endpoints, use less restrictive headers to allow cross-origin requests
	if (c.req.path.startsWith("/api/auth/")) {
		return secureHeaders({
			xFrameOptions: "DENY",
			xContentTypeOptions: "nosniff",
			referrerPolicy: "strict-origin-when-cross-origin",
			// HSTS with preload - ensures browsers always use HTTPS
			strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
			permissionsPolicy: extendedPermissionsPolicy,
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
		// HSTS with preload - ensures browsers always use HTTPS
		strictTransportSecurity: "max-age=31536000; includeSubDomains; preload",
		permissionsPolicy: extendedPermissionsPolicy,
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
// Exclude Sentry tunnel as it's a proxy endpoint (no state changes)
app.use(async (c, next) => {
	// Skip CSRF for auth endpoints (Better-Auth handles it)
	if (c.req.path.startsWith("/api/auth/")) {
		return next();
	}
	// Skip CSRF for Sentry tunnel (proxy endpoint, no state changes)
	if (c.req.path === "/api/sentry-tunnel") {
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

// Rate limiting spécifique pour le renvoi d'email de vérification
// 1 requête toutes les 30 secondes (pour éviter le spam tout en permettant des tentatives raisonnables)
app.use(
	"/api/auth/send-verification-email",
	emailVerificationResendRateLimit(),
);

// Rate limiting spécifique pour la suppression de compte (1 par heure - très strict)
app.use("/api/auth/delete-user", deleteAccountRateLimit());

// Rate limiting spécifique pour la demande de réinitialisation de mot de passe (3 par heure)
// Prevents account enumeration and email spam
app.use("/api/auth/request-password-reset", passwordResetRequestRateLimit());

// Rate limiting spécifique pour le changement de mot de passe (10 par heure)
app.use("/api/auth/change-password", changePasswordRateLimit());

// Rate limiting spécifique pour la mise à jour du profil (20 par heure)
app.use("/api/auth/update-user", updateProfileRateLimit());

// Rate limiting général pour les autres endpoints auth (10 par minute)
app.use("/api/auth/*", authRateLimit());

// Helper function to convert Prisma errors to HTTP responses
// Better-Auth uses Prisma internally, so we need to handle Prisma errors
function handlePrismaErrorForAuth(error: unknown): {
	status: number;
	body: { error: string; code?: string };
} | null {
	// Check if error is a Prisma error by checking for the code property
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		typeof error.code === "string" &&
		error.code.startsWith("P")
	) {
		const prismaError = error as {
			code: string;
			meta?: { target?: string | string[] };
		};

		switch (prismaError.code) {
			case "P2002": {
				// Unique constraint violation (e.g., email already exists)
				const field = prismaError.meta?.target
					? Array.isArray(prismaError.meta.target)
						? prismaError.meta.target.join(", ")
						: String(prismaError.meta.target)
					: "field";

				return {
					status: 409,
					body: {
						error: `A resource with this ${field} already exists`,
						code: "CONFLICT",
					},
				};
			}

			case "P2003": {
				// Foreign key constraint violation
				return {
					status: 400,
					body: {
						error: "Referenced resource does not exist",
						code: "BAD_REQUEST",
					},
				};
			}

			case "P2025": {
				// Record not found
				return {
					status: 404,
					body: {
						error: "Resource not found",
						code: "NOT_FOUND",
					},
				};
			}

			default: {
				// Unknown Prisma error
				return {
					status: 500,
					body: {
						error: "Database error occurred",
						code: "INTERNAL_SERVER_ERROR",
					},
				};
			}
		}
	}

	return null;
}

// Better-Auth handler pour les endpoints auth (tous les méthodes)
// CORS is already handled by the global middleware above
// Best practice: Wrap in try/catch to handle Prisma errors from Better-Auth
app.all("/api/auth/*", async (c) => {
	try {
		const response = await auth.handler(c.req.raw);
		return response;
	} catch (error) {
		// Log error for debugging
		logger.error("Better-Auth handler error", error);

		// Handle Prisma-specific errors (e.g., unique constraint violations)
		// Better-Auth uses Prisma internally, so unhandled Prisma errors may bubble up
		// Note: Better-Auth normally handles errors internally, but this catches unhandled exceptions
		const prismaErrorResponse = handlePrismaErrorForAuth(error);
		if (prismaErrorResponse) {
			// Return error in format compatible with Better-Auth client expectations
			// Better-Auth client expects: error.error.message and error.error.status
			return c.json(
				{
					error: {
						message: prismaErrorResponse.body.error,
						status: prismaErrorResponse.status,
						statusText: prismaErrorResponse.body.code || "Error",
					},
				},
				prismaErrorResponse.status as 400 | 404 | 409 | 500,
			);
		}

		// If not a Prisma error, this is an unexpected error
		// Log to Sentry and return generic error response compatible with Better-Auth format
		Sentry.captureException(error);
		return c.json(
			{
				error: {
					message: "An error occurred during authentication",
					status: 500,
					statusText: "Internal Server Error",
				},
				timestamp: new Date().toISOString(),
			},
			500,
		);
	}
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

// Sentry tunnel endpoint - proxies events from frontend to Sentry
// This bypasses CSP restrictions by sending events through the backend
// Based on official Sentry documentation: https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
app.post("/api/sentry-tunnel", async (c) => {
	try {
		// Get the raw envelope from Sentry SDK
		const envelope = await c.req.text();

		if (!envelope || envelope.trim().length === 0) {
			logger.warn("Sentry tunnel: Empty envelope received");
			return c.json({ error: "Empty envelope" }, 400);
		}

		// Parse the envelope to extract DSN from the header
		// Envelope format: "{header}\n{payload}\n..."
		// Header contains: {"dsn": "https://...", ...}
		const pieces = envelope.split("\n");
		if (pieces.length === 0) {
			logger.error("Sentry tunnel: Invalid envelope format (no newlines)");
			return c.json({ error: "Invalid envelope format" }, 400);
		}

		// Parse the header (first line) to get the DSN
		const firstPiece = pieces[0];
		if (!firstPiece) {
			logger.error(
				"Sentry tunnel: Invalid envelope format (empty first piece)",
			);
			return c.json({ error: "Invalid envelope format" }, 400);
		}

		let header: { dsn?: string } | undefined;
		try {
			header = JSON.parse(firstPiece) as { dsn?: string };
		} catch (error) {
			logger.error("Sentry tunnel: Failed to parse envelope header", {
				error,
				headerPreview: firstPiece.substring(0, 100),
			});
			return c.json({ error: "Invalid envelope header" }, 400);
		}

		// Extract DSN from header
		const dsn = header.dsn;
		if (!dsn) {
			logger.error("Sentry tunnel: DSN not found in envelope header");
			return c.json({ error: "DSN not found in envelope" }, 400);
		}

		// Parse DSN URL to extract project ID
		// Format: https://PUBLIC_KEY@HOST/PROJECT_ID
		let projectId: string;
		try {
			const dsnUrl = new URL(dsn);
			projectId = dsnUrl.pathname.replace("/", "");

			if (!projectId) {
				logger.error("Sentry tunnel: Project ID not found in DSN", {
					dsn: `${dsn.substring(0, 30)}...`,
				});
				return c.json({ error: "Invalid DSN format" }, 400);
			}
		} catch (error) {
			logger.error("Sentry tunnel: Failed to parse DSN URL", {
				error,
				dsn: `${dsn.substring(0, 30)}...`,
			});
			return c.json({ error: "Invalid DSN format" }, 400);
		}

		// Construct Sentry ingest URL
		// Format: https://HOST/api/PROJECT_ID/envelope/
		const dsnUrl = new URL(dsn);
		const sentryUrl = `https://${dsnUrl.host}/api/${projectId}/envelope/`;

		// Forward the complete envelope to Sentry
		// The envelope already contains all authentication information
		const response = await fetch(sentryUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-sentry-envelope",
			},
			body: envelope,
		});

		if (!response.ok) {
			const errorText = await response.text();
			logger.error("Sentry tunnel error", {
				status: response.status,
				statusText: response.statusText,
				error: errorText.substring(0, 200),
			});
			return new Response("Failed to forward to Sentry", {
				status: response.status,
			});
		}

		// Return empty response with same status code as Sentry (usually 200)
		return new Response("", {
			status: response.status,
		});
	} catch (error) {
		logger.error("Sentry tunnel exception", { error });
		return c.json({ error: "Internal server error" }, 500);
	}
});

// CSP violation reporting endpoint
// Receives Content-Security-Policy violation reports from browsers
// Reports are logged and optionally sent to Sentry for monitoring
app.post("/api/csp-report", async (c) => {
	try {
		const contentType = c.req.header("content-type") || "";

		// CSP reports can be sent as application/csp-report or application/json
		if (
			!contentType.includes("application/csp-report") &&
			!contentType.includes("application/json")
		) {
			return c.json({ error: "Invalid content type" }, 400);
		}

		const report = await c.req.json();

		// Extract the CSP violation details
		// Format: { "csp-report": { ... } } or { ... } depending on browser
		const violation = report["csp-report"] || report;

		// Log the violation for security audit
		logger.warn("CSP violation detected", {
			documentUri: violation["document-uri"],
			violatedDirective: violation["violated-directive"],
			effectiveDirective: violation["effective-directive"],
			blockedUri: violation["blocked-uri"],
			sourceFile: violation["source-file"],
			lineNumber: violation["line-number"],
			columnNumber: violation["column-number"],
		});

		// Send to Sentry for centralized monitoring
		Sentry.captureMessage("CSP Violation", {
			level: "warning",
			tags: {
				type: "csp-violation",
				directive: violation["violated-directive"] || "unknown",
			},
			extra: {
				documentUri: violation["document-uri"],
				blockedUri: violation["blocked-uri"],
				sourceFile: violation["source-file"],
			},
		});

		// Return 204 No Content (standard response for report endpoints)
		return new Response(null, { status: 204 });
	} catch (error) {
		// Log but don't expose errors - CSP reports should fail silently
		logger.error("CSP report processing error", error);
		return new Response(null, { status: 204 });
	}
});

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

// Dynamic sitemap.xml generation
app.get("/sitemap.xml", (c) => {
	const baseUrl = "https://calendraft.app";
	const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Landing page - Main entry point -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <!-- Public pages for creating/importing calendars -->
  <url>
    <loc>${baseUrl}/calendars/new</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/calendars/import</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <!-- Authentication page -->
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <!-- Note: /calendars is excluded (private user content, noindex) -->
</urlset>`;

	return c.text(sitemap, 200, {
		"Content-Type": "application/xml; charset=utf-8",
	});
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

// Handle unhandled promise rejections
// Best practice: Always handle unhandledRejection to prevent silent failures
process.on("unhandledRejection", (reason, promise) => {
	logger.error("Unhandled Rejection", reason, { promise });
	Sentry.captureException(
		reason instanceof Error ? reason : new Error(String(reason)),
	);
	// In production, crash to force clean restart (recommended by Node.js)
	// This ensures the process restarts in a clean state
	if (isProduction) {
		logger.error("Crashing due to unhandled rejection in production");
		process.exit(1);
	} else {
		// In development, log but continue for easier debugging
		logger.warn("Unhandled rejection in development - continuing");
	}
});

// Handle uncaught exceptions
// Best practice: Always crash on uncaughtException (critical errors)
process.on("uncaughtException", (error) => {
	logger.error("Uncaught Exception", error);
	Sentry.captureException(error);
	// Uncaught exceptions are always critical - must crash
	// This prevents the process from continuing in an undefined state
	logger.error("Crashing due to uncaught exception");
	process.exit(1);
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
