import type { Context } from "hono";

/**
 * Security headers middleware for Hono
 */

export function securityHeaders() {
	return async (c: Context, next: () => Promise<void>) => {
		// Security headers
		c.header("X-Content-Type-Options", "nosniff");
		c.header("X-Frame-Options", "DENY");
		c.header("X-XSS-Protection", "1; mode=block");
		c.header("Referrer-Policy", "strict-origin-when-cross-origin");

		// Permissions-Policy (formerly Feature-Policy)
		c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

		// Strict-Transport-Security only in production with HTTPS
		// Check x-forwarded-proto header for proxy-aware HTTPS detection
		const isProduction = process.env.NODE_ENV === "production";
		const forwardedProto = c.req.header("x-forwarded-proto");
		const isHTTPS =
			forwardedProto === "https" || c.req.url.startsWith("https://");
		if (isProduction && isHTTPS) {
			c.header(
				"Strict-Transport-Security",
				"max-age=31536000; includeSubDomains",
			);
		}

		return next();
	};
}
