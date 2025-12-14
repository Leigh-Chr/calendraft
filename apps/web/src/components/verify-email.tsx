import { useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";
import { SuccessAnimation } from "./success-animation";
import { Button } from "./ui/button";

export default function VerifyEmail() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/verify-email" });
	const error = search.error as string | undefined;
	const [showSuccess, setShowSuccess] = useState(false);

	useEffect(() => {
		// Si pas d'erreur, la vérification a réussi
		// Better-Auth a déjà vérifié l'email et créé la session
		if (!error) {
			setShowSuccess(true);
			// Rafraîchir la session pour obtenir les données à jour
			void authClient.getSession();
			// Rediriger après l'animation
			const timer = setTimeout(() => {
				navigate({ to: "/calendars" });
			}, 2000);
			return () => clearTimeout(timer);
		}
		// Erreur de vérification (token invalide ou expiré)
		toast.error("Email verification failed. The link may have expired.");
		return undefined;
	}, [error, navigate]);

	// Afficher un loader pendant le traitement
	if (!error && !showSuccess) {
		return (
			<div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
				{/* Background effects */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="aurora absolute inset-0 opacity-50" />
					<div className="dot-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_40%,transparent_100%)]" />
				</div>
				<div className="text-center">
					<Loader />
					<p className="mt-4 text-muted-foreground">Verifying your email...</p>
				</div>
			</div>
		);
	}

	// Afficher l'animation de succès
	if (!error && showSuccess) {
		return (
			<>
				<SuccessAnimation
					show={showSuccess}
					type="success"
					message="Email verified successfully!"
					onComplete={() => {
						setShowSuccess(false);
					}}
				/>
				<div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
					{/* Background effects */}
					<div className="-z-10 pointer-events-none absolute inset-0">
						<div className="aurora absolute inset-0 opacity-50" />
						<div className="dot-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_40%,transparent_100%)]" />
					</div>
					<div className="w-full max-w-md">
						<div className="rounded-xl border bg-card/80 p-6 text-center shadow-black/5 shadow-xl backdrop-blur-sm">
							<div className="mb-4 flex justify-center">
								<CheckCircle2 className="h-16 w-16 text-green-500" />
							</div>
							<h1 className="font-bold text-2xl">Email Verified!</h1>
							<p className="mt-2 text-muted-foreground">
								Your account has been verified. Redirecting to your calendars...
							</p>
						</div>
					</div>
				</div>
			</>
		);
	}

	// Afficher l'erreur avec design cohérent
	return (
		<div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
			{/* Background effects */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="aurora absolute inset-0 opacity-50" />
				<div className="dot-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,#000_40%,transparent_100%)]" />
			</div>
			<div className="w-full max-w-md">
				<div className="rounded-xl border bg-card/80 p-6 text-center shadow-black/5 shadow-xl backdrop-blur-sm">
					<div className="mb-4 flex justify-center">
						<XCircle className="h-16 w-16 text-destructive" />
					</div>
					<h1 className="font-bold text-2xl">Verification Failed</h1>
					<p className="mt-2 text-muted-foreground">
						{error === "invalid_token"
							? "The verification link is invalid or has expired. Please request a new verification email."
							: "An error occurred during email verification."}
					</p>
					<div className="mt-6 space-y-2">
						<Button
							onClick={() => {
								navigate({ to: "/login" });
							}}
							className="w-full"
						>
							Go to Login
						</Button>
						<Button
							variant="outline"
							onClick={() => {
								navigate({ to: "/check-email" });
							}}
							className="w-full"
						>
							Request New Verification Email
						</Button>
						<Button
							variant="ghost"
							onClick={() => {
								navigate({ to: "/" });
							}}
							className="w-full"
						>
							Go to Home
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
