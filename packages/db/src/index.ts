import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { PrismaClient } from "../prisma/generated/client";

// Load .env file from apps/server (same as prisma.config.ts)
dotenv.config({
	path: path.join(__dirname, "../../../apps/server/.env"),
});

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

export default prisma;

export type { PrismaClient } from "../prisma/generated/client";
// Re-export Prisma generated types and enums
export * from "../prisma/generated/enums";
export * from "../prisma/generated/models";
