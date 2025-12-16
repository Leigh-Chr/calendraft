import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { FormMessage } from "./ui/form-message";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

function handleResendVerificationError(
	error: unknown,
	email: string,
	setSubmittedEmail: (email: string) => void,
	setIsSubmitted: (submitted: boolean) => void,
	setCooldownSeconds: (seconds: number) => void,
	navigate: (options: { to: string }) => void,
): void {
	const errorData = error as {
		error?: { message?: string; status?: number };
	};
	const errorMessage = errorData?.error?.message || "";
	const status = errorData?.error?.status;

	if (status === 429) {
		setCooldownSeconds(30);
		toast.error(
			"Too many requests. Please wait 30 seconds before trying again.",
		);
	} else if (
		errorMessage.includes("not found") ||
		errorMessage.includes("does not exist")
	) {
		// Email n'existe pas (meilleure pratique: ne pas révéler si l'email existe)
		// On affiche quand même un message de succès pour éviter l'énumération d'emails
		setSubmittedEmail(email);
		setIsSubmitted(true);
		setCooldownSeconds(30);
		toast.success("If this email exists, a verification link has been sent.");
	} else if (
		errorMessage.includes("already verified") ||
		errorMessage.includes("verified")
	) {
		toast.info("This email is already verified. You can sign in.");
		navigate({ to: "/login" });
	} else {
		toast.error(
			errorMessage || "Failed to send verification email. Please try again.",
		);
	}
}

export default function ResendVerification() {
	const navigate = useNavigate();
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [submittedEmail, setSubmittedEmail] = useState("");
	const [cooldownSeconds, setCooldownSeconds] = useState(0);

	// Gérer le cooldown (30 secondes)
	useEffect(() => {
		if (cooldownSeconds > 0) {
			const timer = setTimeout(() => {
				setCooldownSeconds(cooldownSeconds - 1);
			}, 1000);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, [cooldownSeconds]);

	const form = useForm({
		defaultValues: {
			email: "",
		},
		onSubmit: async ({ value }) => {
			if (cooldownSeconds > 0) {
				toast.error(
					`Please wait ${cooldownSeconds} seconds before requesting another email.`,
				);
				return;
			}

			try {
				await authClient.sendVerificationEmail({
					email: value.email,
					callbackURL: "/verify-email",
				});
				setSubmittedEmail(value.email);
				setIsSubmitted(true);
				setCooldownSeconds(30); // 30 secondes de cooldown
				toast.success("Verification email sent! Please check your inbox.");
			} catch (error: unknown) {
				handleResendVerificationError(
					error,
					value.email,
					setSubmittedEmail,
					setIsSubmitted,
					setCooldownSeconds,
					navigate,
				);
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
							Verification link sent
						</p>
					</div>

					{/* Content card */}
					<div className="rounded-xl border bg-card/80 p-6 shadow-black/5 shadow-xl backdrop-blur-sm">
						<div className="space-y-4 text-center">
							<p className="text-muted-foreground">
								We've sent a verification link to your email address.
							</p>
							{submittedEmail && (
								<p className="font-medium text-foreground text-sm">
									{submittedEmail}
								</p>
							)}
							<p className="text-muted-foreground text-sm">
								Click the link in the email to verify your account. The link
								will expire in 1 hour.
							</p>
							<p className="text-muted-foreground text-xs">
								💡 <strong>Tip:</strong> Don't see the email? Check your spam or
								junk folder.
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
					<h1 className="text-center font-bold text-3xl">
						Resend verification email
					</h1>
					<p className="mt-2 text-center text-muted-foreground text-sm">
						Enter your email address and we'll send you a new verification link.
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
									disabled={
										!state.canSubmit ||
										state.isSubmitting ||
										cooldownSeconds > 0
									}
								>
									{state.isSubmitting
										? "Sending..."
										: cooldownSeconds > 0
											? `Wait ${cooldownSeconds}s before resending`
											: "Send verification link"}
								</Button>
							)}
						</form.Subscribe>
						{cooldownSeconds > 0 && (
							<p className="text-center text-muted-foreground text-xs">
								You can request another email in {cooldownSeconds} seconds.
							</p>
						)}
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
