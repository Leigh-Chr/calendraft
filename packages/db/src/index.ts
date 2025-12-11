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

const prisma = new PrismaClient({ adapter });

export default prisma;

export type { PrismaClient } from "../prisma/generated/client";
// Re-export Prisma namespace for SQL queries
export { Prisma } from "../prisma/generated/client";
// Re-export Prisma generated types and enums
export * from "../prisma/generated/enums";
export * from "../prisma/generated/models";
