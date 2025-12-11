/**
 * Environment variable validation for auth package
 */

import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).optional(),
	CORS_ORIGIN: z.string().url().optional(),
	RESEND_API_KEY: z.string().min(1).optional(),
	EMAIL_FROM: z.string().email().optional(),
	SMTP_HOST: z.string().min(1).optional(),
	SMTP_PORT: z.string().optional(),
	SMTP_SECURE: z.string().optional(),
	SMTP_USER: z.string().min(1).optional(),
	SMTP_PASSWORD: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
