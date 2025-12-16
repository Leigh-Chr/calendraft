import { createFileRoute, redirect } from "@tanstack/react-router";
import EditProfile from "@/components/edit-profile";
import { authClient } from "@/lib/auth-client";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/edit-profile")({
	component: EditProfile,
	head: () => ({
		meta: [
			{ title: "Edit Profile - Calendraft" },
			{
				name: "description",
				content: "Edit your Calendraft account profile information.",
			},
			{ property: "og:title", content: "Edit Profile - Calendraft" },
			{ property: "og:url", content: `${BASE_URL}/edit-profile` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/edit-profile` }],
	}),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				search: { mode: "signin", redirect: "/edit-profile" },
				throw: true,
			});
		}
		return { session };
	},
});
