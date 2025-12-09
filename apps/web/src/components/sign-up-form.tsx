import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Eye, EyeOff, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";
import { Button } from "./ui/button";
import { FormMessage } from "./ui/form-message";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({
	onSwitchToSignIn,
	redirectTo: _redirectTo,
}: {
	onSwitchToSignIn: () => void;
	/** URL to redirect to after successful registration */
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
			name: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signUp.email(
				{
					email: value.email,
					password: value.password,
					name: value.name,
				},
				{
					onSuccess: () => {
						// Rediriger vers la page "check your email" avec l'email en paramètre
						navigate({
							to: "/check-email",
							search: { email: value.email },
						});
						toast.success(
							"Registration successful! Please check your email to verify your account.",
						);
					},
					onError: (error) => {
						// Gestion spécifique des erreurs
						const errorMessage =
							error.error.message || error.error.statusText || "";

						// Erreur pour email temporaire bloqué (via better-auth-harmony)
						if (
							errorMessage.includes("temporary") ||
							errorMessage.includes("disposable") ||
							errorMessage.includes("not allowed")
						) {
							toast.error(
								"Temporary email addresses are not allowed. Please use a permanent email address.",
							);
						}
						// Erreur de rate limiting
						else if (error.error.status === 429) {
							toast.error("Too many signup attempts. Please try again later.");
						}
						// Erreur email déjà utilisé
						else if (
							errorMessage.includes("already") ||
							errorMessage.includes("exists") ||
							errorMessage.includes("duplicate")
						) {
							toast.error("This email address is already registered.");
						}
						// Autres erreurs
						else {
							toast.error(
								errorMessage || "Registration failed. Please try again.",
							);
						}
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Name must contain at least 2 characters"),
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
					<h1 className="text-center text-heading-1">Create an account</h1>
					<p className="mt-2 flex items-center gap-2 text-center text-muted-foreground text-sm">
						<Sparkles className="size-4 text-primary" />
						Synchronize your calendars everywhere
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
							<form.Field name="name">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Name</Label>
										<Input
											id={field.name}
											name={field.name}
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
							<form.Field name="email">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Email</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											autoComplete="email"
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
												autoComplete="new-password"
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
												className="-translate-y-1/2 absolute top-1/2 right-3 text-muted-foreground transition-colors hover:text-foreground"
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

						{/* Info message about email verification */}
						<div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-muted-foreground text-sm">
							<p>
								After signing up, you'll receive a verification email. Please
								check your inbox to activate your account.
							</p>
						</div>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									className="interactive-glow w-full"
									disabled={!state.canSubmit || state.isSubmitting}
								>
									{state.isSubmitting ? "Registering..." : "Sign up"}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<div className="mt-4 text-center">
						<Button variant="link" onClick={onSwitchToSignIn}>
							Already have an account? Sign in
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
