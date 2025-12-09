import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import VerifyEmail from "@/components/verify-email";

const BASE_URL = "https://calendraft.app";

const verifyEmailSearchSchema = z.object({
	error: z.string().optional(), // "invalid_token" si le token est invalide
});

export const Route = createFileRoute("/verify-email")({
	component: VerifyEmail,
	validateSearch: zodValidator(verifyEmailSearchSchema),
	head: () => ({
		meta: [
			{ title: "Verify Email - Calendraft" },
			{
				name: "description",
				content:
					"Verify your email address to complete your Calendraft account setup.",
			},
			{ property: "og:title", content: "Verify Email - Calendraft" },
			{ property: "og:url", content: `${BASE_URL}/verify-email` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/verify-email` }],
	}),
});
