/**
 * Environment variable validation for auth package
 */

import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).optional(),
	CORS_ORIGIN: z.string().url().optional(),
	RESEND_API_KEY: z.string().optional(),
	EMAIL_FROM: z
		.string()
		.optional()
		.refine(
			(val) => {
				if (val === undefined || val === "") return true;
				return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
			},
			{
				message: "Invalid email address",
			},
		),
	SMTP_HOST: z.string().optional(),
	SMTP_PORT: z.string().optional(),
	SMTP_SECURE: z.string().optional(),
	SMTP_USER: z.string().optional(),
	SMTP_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);
