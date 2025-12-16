import { createFileRoute, redirect } from "@tanstack/react-router";
import DeleteAccount from "@/components/delete-account";
import { authClient } from "@/lib/auth-client";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/delete-account")({
	component: DeleteAccount,
	head: () => ({
		meta: [
			{ title: "Delete Account - Calendraft" },
			{
				name: "description",
				content: "Delete your Calendraft account permanently.",
			},
			{ property: "og:title", content: "Delete Account - Calendraft" },
			{ property: "og:url", content: `${BASE_URL}/delete-account` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/delete-account` }],
	}),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				search: { mode: "signin", redirect: "/delete-account" },
				throw: true,
			});
		}
		return { session };
	},
});
