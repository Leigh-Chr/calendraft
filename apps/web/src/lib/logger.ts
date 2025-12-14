/**
 * Client-side logger
 * Uses Sentry in production, console in development
 */

import * as Sentry from "@sentry/react";

const isDev = import.meta.env.DEV;

export const logger = {
	info: (message: string, data?: unknown) => {
		if (isDev) {
			console.log(`[INFO] ${message}`, data || "");
		}
		// In production, info logs are typically not sent to Sentry
	},
	warn: (message: string, data?: unknown) => {
		if (isDev) {
			console.warn(`[WARN] ${message}`, data || "");
		}
		// Send warnings to Sentry in production
		if (!isDev && data !== undefined) {
			Sentry.captureMessage(message, {
				level: "warning",
				extra: data as Record<string, unknown>,
			});
		} else if (!isDev) {
			Sentry.captureMessage(message, {
				level: "warning",
			});
		}
	},
	error: (message: string, error?: unknown, data?: unknown) => {
		if (isDev) {
			console.error(`[ERROR] ${message}`, error || "", data || "");
		}
		// Always send errors to Sentry
		if (error instanceof Error) {
			Sentry.captureException(error, {
				extra: data as Record<string, unknown>,
			});
		} else {
			Sentry.captureMessage(message, {
				level: "error",
				extra: {
					error,
					...(typeof data === "object" && data !== null
						? (data as Record<string, unknown>)
						: { data }),
				},
			});
		}
	},
};
