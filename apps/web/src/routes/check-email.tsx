import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import CheckEmail from "@/components/check-email";

const BASE_URL = "https://calendraft.app";

const checkEmailSearchSchema = z.object({
	email: z.string().email().optional(), // Email pour pouvoir renvoyer le lien
	redirect: z.string().optional(), // URL de redirection après vérification
});

export const Route = createFileRoute("/check-email")({
	component: CheckEmail,
	validateSearch: zodValidator(checkEmailSearchSchema),
	head: () => ({
		meta: [
			{ title: "Check Your Email - Calendraft" },
			{
				name: "description",
				content: "Please check your email to verify your Calendraft account.",
			},
			{ property: "og:title", content: "Check Your Email - Calendraft" },
			{ property: "og:url", content: `${BASE_URL}/check-email` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/check-email` }],
	}),
});
