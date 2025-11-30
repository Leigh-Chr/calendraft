import path from "node:path";
import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

export default {
	schema: path.join("prisma", "schema"),
	migrations: {
		path: path.join("prisma", "migrations"),
	},
	datasource: {
		url: process.env.DATABASE_URL || "file:./local.db",
	},
};
