/**
 * Seed users, accounts, and sessions
 */
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";
import type { UserModel } from "../../src/index.js";
import prisma from "../../src/index.js";

/**
 * Hash a password using scrypt (Better-Auth format: salt:key)
 * This matches Better-Auth's implementation exactly:
 * - Salt: 16 bytes, hex encoded
 * - Password: normalized with NFKC
 * - Key: 64 bytes, hex encoded
 * - Format: salt:key (both hex encoded)
 * - Parameters: N=16384, r=16, p=1, dkLen=64
 *
 * Better-Auth source code reference:
 * const salt = hex.encode(crypto.getRandomValues(new Uint8Array(16)));
 * const key = await generateKey(password, salt);
 * return `${salt}:${hex.encode(key)}`;
 *
 * Where generateKey does:
 * return await scryptAsync(password.normalize("NFKC"), salt, {
 *   N: 16384, r: 16, p: 1, dkLen: 64,
 *   maxmem: 128 * config.N * config.r * 2
 * });
 */
async function hashPassword(password: string): Promise<string> {
	// Better-Auth generates salt as hex string: hex.encode(crypto.getRandomValues(new Uint8Array(16)))
	const saltBytes = randomBytes(16);
	const salt = bytesToHex(saltBytes);

	// Better-Auth normalizes password with NFKC and passes salt (hex string) directly to scryptAsync
	// Parameters: N=16384, r=16, p=1, dkLen=64
	// scryptAsync from @noble/hashes accepts hex strings directly
	const key = await scryptAsync(password.normalize("NFKC"), salt, {
		N: 16384,
		r: 16,
		p: 1,
		dkLen: 64,
		maxmem: 128 * 16384 * 16 * 2, // Better-Auth's maxmem calculation
	});

	// Format: salt:key (both hex encoded)
	return `${salt}:${bytesToHex(key)}`;
}

export interface SeedUsers {
	userAlice: Pick<UserModel, "id">;
	userBob: Pick<UserModel, "id">;
	userClaire: Pick<UserModel, "id">;
	userDavid: Pick<UserModel, "id">;
	userEva: Pick<UserModel, "id">;
	userLimitTest: Pick<UserModel, "id">;
}

/**
 * Create all users
 */
export async function seedUsers(): Promise<SeedUsers> {
	console.log("👤 Creating users...");

	const userAlice = await prisma.user.create({
		data: {
			id: "user-alice-dev",
			name: "Alice Martin",
			email: "alice.martin@example.com",
			emailVerified: true,
			image: null,
			createdAt: new Date("2024-01-15T10:00:00Z"),
			updatedAt: new Date("2024-01-15T10:00:00Z"),
		},
	});

	const userBob = await prisma.user.create({
		data: {
			id: "user-bob-manager",
			name: "Bob Dupont",
			email: "bob.dupont@example.com",
			emailVerified: true,
			image: null,
			createdAt: new Date("2024-02-01T14:30:00Z"),
			updatedAt: new Date("2024-02-01T14:30:00Z"),
		},
	});

	const userClaire = await prisma.user.create({
		data: {
			id: "user-claire-student",
			name: "Claire Bernard",
			email: "claire.bernard@example.com",
			emailVerified: false,
			image: null,
			createdAt: new Date("2024-03-10T09:15:00Z"),
			updatedAt: new Date("2024-03-10T09:15:00Z"),
		},
	});

	const userDavid = await prisma.user.create({
		data: {
			id: "user-david-freelance",
			name: "David Chen",
			email: "david.chen@example.com",
			emailVerified: true,
			image: "https://example.com/avatars/david.jpg",
			createdAt: new Date("2024-04-20T11:00:00Z"),
			updatedAt: new Date("2024-04-20T11:00:00Z"),
		},
	});

	const userEva = await prisma.user.create({
		data: {
			id: "user-eva-family",
			name: "Eva Rodriguez",
			email: "eva.rodriguez@example.com",
			emailVerified: true,
			image: null,
			createdAt: new Date("2024-05-05T16:20:00Z"),
			updatedAt: new Date("2024-05-05T16:20:00Z"),
		},
	});

	const userLimitTest = await prisma.user.create({
		data: {
			id: "user-limit-test",
			name: "Test Limit User",
			email: "limit.test@example.com",
			emailVerified: true,
			image: null,
			createdAt: new Date("2024-06-01T08:00:00Z"),
			updatedAt: new Date("2024-06-01T08:00:00Z"),
		},
	});

	return {
		userAlice,
		userBob,
		userClaire,
		userDavid,
		userEva,
		userLimitTest,
	};
}

/**
 * Create accounts for authenticated users
 *
 * Test passwords (for development only):
 * - alice.martin@example.com: password123
 * - david.chen@example.com: password123
 */
export async function seedAccounts(users: SeedUsers): Promise<void> {
	console.log("🔐 Creating accounts...");

	// Generate scrypt hashes for test passwords (Better-Auth format: salt:key)
	const alicePasswordHash = await hashPassword("password123");
	const davidPasswordHash = await hashPassword("password123");

	await prisma.account.createMany({
		data: [
			{
				id: "account-alice-google",
				accountId: "google-123456789012345",
				providerId: "google",
				userId: users.userAlice.id,
				accessToken: null,
				refreshToken: null,
				idToken: null,
				accessTokenExpiresAt: null,
				refreshTokenExpiresAt: null,
				scope: "openid email profile",
				password: null,
				createdAt: new Date("2024-01-15T10:00:00Z"),
				updatedAt: new Date("2024-01-15T10:00:00Z"),
			},
			{
				id: "account-alice-credential",
				accountId: "alice.martin@example.com",
				providerId: "credential",
				userId: users.userAlice.id,
				accessToken: null,
				refreshToken: null,
				idToken: null,
				accessTokenExpiresAt: null,
				refreshTokenExpiresAt: null,
				scope: null,
				password: alicePasswordHash,
				createdAt: new Date("2024-01-15T10:00:00Z"),
				updatedAt: new Date("2024-01-15T10:00:00Z"),
			},
			{
				id: "account-bob-github",
				accountId: "github-987654321098765",
				providerId: "github",
				userId: users.userBob.id,
				accessToken: null,
				refreshToken: null,
				idToken: null,
				accessTokenExpiresAt: null,
				refreshTokenExpiresAt: null,
				scope: "user:email",
				password: null,
				createdAt: new Date("2024-02-01T14:30:00Z"),
				updatedAt: new Date("2024-02-01T14:30:00Z"),
			},
			{
				id: "account-david-credential",
				accountId: "david.chen@example.com",
				providerId: "credential",
				userId: users.userDavid.id,
				accessToken: null,
				refreshToken: null,
				idToken: null,
				accessTokenExpiresAt: null,
				refreshTokenExpiresAt: null,
				scope: null,
				password: davidPasswordHash,
				createdAt: new Date("2024-04-20T11:00:00Z"),
				updatedAt: new Date("2024-04-20T11:00:00Z"),
			},
		],
	});
}

/**
 * Create sessions for authenticated users
 */
export async function seedSessions(users: SeedUsers): Promise<void> {
	console.log("🔑 Creating sessions...");

	await prisma.session.createMany({
		data: [
			{
				id: "session-alice-1",
				userId: users.userAlice.id,
				token: "550e8400-e29b-41d4-a716-446655440000",
				expiresAt: new Date("2025-12-31T23:59:59Z"),
				ipAddress: "192.168.1.100",
				userAgent:
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				createdAt: new Date("2024-12-01T10:00:00Z"),
				updatedAt: new Date("2024-12-01T10:00:00Z"),
			},
			{
				id: "session-bob-1",
				userId: users.userBob.id,
				token: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
				expiresAt: new Date("2024-12-20T23:59:59Z"),
				ipAddress: "10.0.0.50",
				userAgent:
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36",
				createdAt: new Date("2024-11-20T14:30:00Z"),
				updatedAt: new Date("2024-11-20T14:30:00Z"),
			},
			{
				id: "session-david-1",
				userId: users.userDavid.id,
				token: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
				expiresAt: new Date("2025-06-30T23:59:59Z"),
				ipAddress: "172.16.0.25",
				userAgent:
					"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				createdAt: new Date("2024-12-05T09:00:00Z"),
				updatedAt: new Date("2024-12-05T09:00:00Z"),
			},
		],
	});
}
