import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";
import { Button } from "./ui/button";
import { FormMessage } from "./ui/form-message";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm({
	onSwitchToSignUp,
	redirectTo,
}: {
	onSwitchToSignUp: () => void;
	/** URL to redirect to after successful login */
	redirectTo?: string;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();
	const [showPassword, setShowPassword] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						// Redirect to specified URL or default to calendars list
						if (redirectTo) {
							navigate({ to: redirectTo });
						} else {
							navigate({ to: "/calendars" });
						}
						toast.success("Login successful");
					},
					onError: (error) => {
						// Gestion spécifique des erreurs
						const errorMessage =
							error.error.message || error.error.statusText || "";

						// Erreur email non vérifié
						if (
							errorMessage.includes("email") &&
							(errorMessage.includes("not verified") ||
								errorMessage.includes("unverified") ||
								errorMessage.includes("verify"))
						) {
							toast.error(
								"Please verify your email address before signing in.",
								{
									action: {
										label: "Resend email",
										onClick: async () => {
											try {
												await authClient.sendVerificationEmail({
													email: value.email,
													callbackURL: "/verify-email",
												});
												toast.success(
													"Verification email sent! Please check your inbox.",
												);
												navigate({
													to: "/check-email",
													search: { email: value.email },
												});
											} catch {
												toast.error(
													"Failed to send verification email. Please try again.",
												);
											}
										},
									},
								},
							);
						}
						// Erreur credentials invalides
						else if (
							errorMessage.includes("invalid") ||
							errorMessage.includes("incorrect") ||
							error.error.status === 401
						) {
							toast.error(
								"Invalid email or password. Please check your credentials and try again.",
							);
						}
						// Erreur de rate limiting
						else if (error.error.status === 429) {
							toast.error(
								"Too many login attempts. Please wait a moment and try again.",
							);
						}
						// Autres erreurs
						else {
							toast.error(errorMessage || "Login failed. Please try again.");
						}
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z
					.string()
					.min(8, "Password must contain at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
			{/* Background effects */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="aurora absolute inset-0 opacity-50" />
				<div className="dot-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_40%,transparent_100%)]" />
			</div>

			<div className="w-full max-w-md">
				{/* Logo/Brand */}
				<div className="mb-8 flex flex-col items-center">
					<div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 shadow-lg shadow-primary/20">
						<Calendar className="size-7 text-primary" />
					</div>
					<h1 className="text-center text-heading-1">Welcome back!</h1>
					<p className="mt-2 text-center text-muted-foreground text-sm">
						Sign in to access your calendars
					</p>
				</div>

				{/* Form card */}
				<div className="rounded-xl border bg-card/80 p-6 shadow-black/5 shadow-xl backdrop-blur-sm">
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<div>
							<form.Field name="email">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Email</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											autoComplete="email"
											enterKeyHint="next"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-describedby={
												field.state.meta.errors.length > 0
													? `${field.name}-error`
													: undefined
											}
											aria-invalid={
												field.state.meta.errors.length > 0 ? true : undefined
											}
										/>
										{field.state.meta.errors.map((error) => (
											<FormMessage
												key={error?.message}
												id={`${field.name}-error`}
											>
												{error?.message}
											</FormMessage>
										))}
									</div>
								)}
							</form.Field>
						</div>

						<div>
							<form.Field name="password">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Password</Label>
										<div className="relative">
											<Input
												id={field.name}
												name={field.name}
												type={showPassword ? "text" : "password"}
												autoComplete="current-password"
												enterKeyHint="done"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-describedby={
													field.state.meta.errors.length > 0
														? `${field.name}-error`
														: undefined
												}
												aria-invalid={
													field.state.meta.errors.length > 0 ? true : undefined
												}
											/>
											<button
												type="button"
												onClick={() => setShowPassword(!showPassword)}
												className="-translate-y-1/2 absolute top-1/2 right-3 flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
											>
												{showPassword ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</button>
										</div>
										{field.state.meta.errors.map((error) => (
											<FormMessage
												key={error?.message}
												id={`${field.name}-error`}
											>
												{error?.message}
											</FormMessage>
										))}
									</div>
								)}
							</form.Field>
						</div>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									className="interactive-glow w-full"
									disabled={!state.canSubmit || state.isSubmitting}
								>
									{state.isSubmitting ? "Signing in..." : "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<div className="mt-4 space-y-2 text-center">
						<Button
							variant="link"
							onClick={() => {
								navigate({ to: "/forgot-password" });
							}}
							className="text-sm"
						>
							Forgot password?
						</Button>
						<div>
							<Button variant="link" onClick={onSwitchToSignUp}>
								Don't have an account? Sign up
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
