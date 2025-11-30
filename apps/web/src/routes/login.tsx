import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { loginDefaults, loginSearchSchema } from "@/lib/search-params";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
	validateSearch: zodValidator(loginSearchSchema),
	search: {
		middlewares: [stripSearchParams(loginDefaults)],
	},
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
