import { createFileRoute } from "@tanstack/react-router";
import ForgotPassword from "@/components/forgot-password";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/forgot-password")({
	component: ForgotPassword,
	head: () => ({
		meta: [
			{ title: "Forgot Password - Calendraft" },
			{
				name: "description",
				content:
					"Reset your Calendraft account password if you've forgotten it.",
			},
			{ property: "og:title", content: "Forgot Password - Calendraft" },
			{ property: "og:url", content: `${BASE_URL}/forgot-password` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/forgot-password` }],
	}),
});
