import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../prisma/generated/client";

// Load .env file from apps/server (same as prisma.config.ts)
dotenv.config({
	path: path.join(__dirname, "../../../apps/server/.env"),
});

import { env } from "./env";

const connectionString = env.DATABASE_URL;

const adapter = new PrismaPg({ connectionString });

// Singleton pattern for long-running processes (recommended by Prisma)
// This prevents multiple PrismaClient instances and connection pool exhaustion
// See: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#long-running-processes
const globalForPrisma = globalThis as unknown as {
	prisma?: PrismaClient;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// In development, store in global to prevent multiple instances during hot-reload
// In production, module caching should already prevent multiple instances,
// but this pattern is an explicit best practice recommended by Prisma
if (process.env["NODE_ENV"] !== "production") {
	globalForPrisma.prisma = prisma;
}

export default prisma;

export type { PrismaClient } from "../prisma/generated/client";
// Re-export Prisma namespace for SQL queries
export { Prisma } from "../prisma/generated/client";
// Re-export Prisma generated types and enums
export * from "../prisma/generated/enums";
export * from "../prisma/generated/models";
