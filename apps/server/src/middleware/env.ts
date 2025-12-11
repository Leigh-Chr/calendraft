/**
 * Environment variable validation for rate limiting middleware
 */

import { z } from "zod";

const envSchema = z.object({
	REDIS_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
