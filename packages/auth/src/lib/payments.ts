import { Polar } from "@polar-sh/sdk";

const isProduction = process.env.NODE_ENV === "production";

export const polarClient = new Polar({
	accessToken: process.env.POLAR_ACCESS_TOKEN,
	server: isProduction ? "production" : "sandbox",
});
