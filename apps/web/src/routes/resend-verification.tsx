import { createFileRoute } from "@tanstack/react-router";
import ResendVerification from "@/components/resend-verification";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/resend-verification")({
	component: ResendVerification,
	head: () => ({
		meta: [
			{ title: "Resend Verification Email - Calendraft" },
			{
				name: "description",
				content:
					"Resend the verification email for your Calendraft account if you didn't receive it.",
			},
			{
				property: "og:title",
				content: "Resend Verification Email - Calendraft",
			},
			{ property: "og:url", content: `${BASE_URL}/resend-verification` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/resend-verification` }],
	}),
});
