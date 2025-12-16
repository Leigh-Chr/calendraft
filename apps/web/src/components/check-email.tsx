import { useNavigate, useSearch } from "@tanstack/react-router";
import { Mail, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export default function CheckEmail() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/check-email" });
	const email = (search.email as string | undefined) || "";
	const redirect = (search.redirect as string | undefined) || "";
	const [isResending, setIsResending] = useState(false);

	const handleResendEmail = async () => {
		if (!email) {
			toast.error("Email address not found. Please try signing up again.");
			return;
		}

		// Stocker le redirect dans localStorage pour le récupérer après vérification
		if (redirect) {
			localStorage.setItem("signup_redirect", redirect);
		}

		setIsResending(true);
		try {
			await authClient.sendVerificationEmail({
				email,
				callbackURL: "/verify-email",
			});
			toast.success("Verification email sent! Please check your inbox.");
		} catch (_error) {
			toast.error("Failed to send verification email. Please try again.");
		} finally {
			setIsResending(false);
		}
	};

	return (
		<div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
			{/* Background effects - cohérent avec sign-up-form */}
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
					<h1 className="text-center text-heading-1">Check your email</h1>
					<p className="mt-2 flex items-center gap-2 text-center text-body text-muted-foreground">
						<Sparkles className="size-4 text-primary" />
						We've sent you a verification link
					</p>
				</div>

				{/* Content card */}
				<div className="rounded-xl border bg-card/80 p-6 shadow-black/5 shadow-xl backdrop-blur-sm">
					<div className="space-y-4 text-center">
						<p className="text-muted-foreground">
							We've sent a verification link to your email address.
						</p>
						{email && (
							<p className="font-medium text-foreground text-small">{email}</p>
						)}
						<p className="text-muted-foreground text-small">
							Click the link in the email to verify your account and complete
							your registration.
						</p>
						<div className="space-y-2 pt-2">
							<Button
								variant="outline"
								onClick={handleResendEmail}
								disabled={isResending || !email}
								className="w-full"
							>
								{isResending ? "Sending..." : "Resend verification email"}
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
