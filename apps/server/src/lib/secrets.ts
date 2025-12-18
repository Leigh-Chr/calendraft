/**
 * Docker Secrets Helper
 *
 * Reads secrets from Docker secrets files (/run/secrets/) with fallback to environment variables.
 * This allows gradual migration to Docker secrets without breaking existing deployments.
 *
 * Usage:
 *   const dbPassword = getSecret('DATABASE_PASSWORD');
 *   // Tries /run/secrets/DATABASE_PASSWORD first, then process.env.DATABASE_PASSWORD
 *
 * Docker Compose setup:
 *   secrets:
 *     database_password:
 *       file: ./secrets/database_password.txt
 *   services:
 *     server:
 *       secrets:
 *         - database_password
 */

import { existsSync, readFileSync } from "node:fs";
import { logger } from "./logger";

const SECRETS_PATH = "/run/secrets";

/**
 * Read a secret from Docker secrets file or fallback to environment variable
 * @param name - Name of the secret (case-sensitive for Docker secrets, converted for env vars)
 * @returns The secret value or undefined if not found
 */
export function getSecret(name: string): string | undefined {
	// Try Docker secrets first (production best practice)
	const secretPath = `${SECRETS_PATH}/${name.toLowerCase()}`;

	if (existsSync(secretPath)) {
		try {
			const value = readFileSync(secretPath, "utf8").trim();
			// Log that we're using Docker secrets (without revealing the value)
			logger.info(`Using Docker secret for ${name}`);
			return value;
		} catch (error) {
			logger.warn(`Failed to read Docker secret ${name}`, error);
		}
	}

	// Fallback to environment variable
	return process.env[name];
}

/**
 * Get a required secret - throws if not found
 * @param name - Name of the secret
 * @returns The secret value
 * @throws Error if secret is not found
 */
export function getRequiredSecret(name: string): string {
	const value = getSecret(name);
	if (!value) {
		throw new Error(
			`Required secret ${name} not found. Set it via Docker secret or environment variable.`,
		);
	}
	return value;
}

/**
 * Check if Docker secrets are being used
 * Useful for logging/debugging to know which mode is active
 */
export function isUsingDockerSecrets(): boolean {
	return existsSync(SECRETS_PATH);
}
