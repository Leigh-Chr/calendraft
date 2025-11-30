import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../prisma/generated/client";

const adapter = new PrismaLibSql({
	url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

export default prisma;

export type { PrismaClient } from "../prisma/generated/client";
// Re-export Prisma generated types and enums
export * from "../prisma/generated/enums";
export * from "../prisma/generated/models";
