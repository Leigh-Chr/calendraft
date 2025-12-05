import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { loginDefaults, loginSearchSchema } from "@/lib/search-params";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: zodValidator(loginSearchSchema),
	search: {
		middlewares: [stripSearchParams(loginDefaults)],
	},
	head: () => ({
		meta: [
			{ title: "Sign in - Calendraft" },
			{
				name: "description",
				content:
					"Sign in or create a Calendraft account to access your synchronized calendars.",
			},
			{ property: "og:title", content: "Login - Calendraft" },
			{ property: "og:url", content: `${BASE_URL}/login` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/login` }],
	}),
});

function RouteComponent() {
	const search = Route.useSearch();
	const navigate = useNavigate();

	const handleSwitchToSignUp = () => {
		navigate({
			to: ".",
			search: { ...search, mode: "signup" },
		});
	};

	const handleSwitchToSignIn = () => {
		navigate({
			to: ".",
			search: { ...search, mode: "signin" },
		});
	};

	return search.mode === "signin" ? (
		<SignInForm
			onSwitchToSignUp={handleSwitchToSignUp}
			redirectTo={search.redirect}
		/>
	) : (
		<SignUpForm
			onSwitchToSignIn={handleSwitchToSignIn}
			redirectTo={search.redirect}
		/>
	);
}
