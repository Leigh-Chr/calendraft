import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Mail, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { FormMessage } from "./ui/form-message";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function ForgotPassword() {
	const navigate = useNavigate();
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [submittedEmail, setSubmittedEmail] = useState("");

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			try {
				await authClient.requestPasswordReset({
					email: value.email,
					redirectTo: "/reset-password",
				});
				setSubmittedEmail(value.email);
				setIsSubmitted(true);
				toast.success("Password reset email sent! Please check your inbox.");
			} catch (error: unknown) {
				const errorMessage =
					(error as { error?: { message?: string } })?.error?.message ||
					"Failed to send password reset email. Please try again.";
				toast.error(errorMessage);
			}
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
			}),
		},
	});

	if (isSubmitted) {
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
							<Mail className="size-7 text-primary" />
						</div>
						<h1 className="text-center font-bold text-3xl">Check your email</h1>
						<p className="mt-2 flex items-center gap-2 text-center text-muted-foreground text-sm">
							<Sparkles className="size-4 text-primary" />
							Password reset link sent
						</p>
					</div>

					{/* Content card */}
					<div className="rounded-xl border bg-card/80 p-6 shadow-black/5 shadow-xl backdrop-blur-sm">
						<div className="space-y-4 text-center">
							<p className="text-muted-foreground">
								We've sent a password reset link to your email address.
							</p>
							{submittedEmail && (
								<p className="font-medium text-foreground text-sm">
									{submittedEmail}
								</p>
							)}
							<p className="text-muted-foreground text-sm">
								Click the link in the email to reset your password. The link
								will expire in 1 hour.
							</p>
							<div className="space-y-2 pt-2">
								<Button
									variant="outline"
									onClick={() => {
										setIsSubmitted(false);
										form.reset();
									}}
									className="w-full"
								>
									Send another email
								</Button>
								<Button
									variant="ghost"
									onClick={() => {
										navigate({ to: "/login" });
									}}
									className="w-full"
								>
									Back to Login
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
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
					<h1 className="text-center font-bold text-3xl">Forgot password?</h1>
					<p className="mt-2 text-center text-muted-foreground text-sm">
						Enter your email address and we'll send you a link to reset your
						password.
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

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									className="interactive-glow w-full"
									disabled={!state.canSubmit || state.isSubmitting}
								>
									{state.isSubmitting ? "Sending..." : "Send reset link"}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<div className="mt-4 text-center">
						<Button
							variant="link"
							onClick={() => {
								navigate({ to: "/login" });
							}}
						>
							Back to Login
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
