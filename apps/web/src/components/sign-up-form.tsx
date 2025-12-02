import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Sparkles } from "lucide-react";
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
	redirectTo,
}: {
	onSwitchToSignIn: () => void;
	/** URL to redirect to after successful registration */
	redirectTo?: string;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

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
						// Redirect to specified URL or default to calendars list
						if (redirectTo) {
							navigate({ to: redirectTo });
						} else {
							navigate({ to: "/calendars" });
						}
						toast.success("Inscription réussie");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
				email: z.email("Adresse email invalide"),
				password: z
					.string()
					.min(8, "Le mot de passe doit contenir au moins 8 caractères"),
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
					<h1 className="text-center font-bold text-3xl">Créer un compte</h1>
					<p className="mt-2 flex items-center gap-2 text-center text-muted-foreground text-sm">
						<Sparkles className="size-4 text-primary" />
						Synchronisez vos calendriers partout
					</p>
				</div>

				{/* Form card */}
				<div className="card-gradient-border rounded-xl border bg-card/80 p-6 shadow-black/5 shadow-xl backdrop-blur-sm">
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
										<Label htmlFor={field.name}>Nom</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<FormMessage key={error?.message}>
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
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<FormMessage key={error?.message}>
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
										<Label htmlFor={field.name}>Mot de passe</Label>
										<Input
											id={field.name}
											name={field.name}
											type="password"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<FormMessage key={error?.message}>
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
									{state.isSubmitting
										? "Inscription en cours..."
										: "S'inscrire"}
								</Button>
							)}
						</form.Subscribe>
					</form>

					<div className="mt-4 text-center">
						<Button variant="link" onClick={onSwitchToSignIn}>
							Déjà un compte ? Se connecter
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
