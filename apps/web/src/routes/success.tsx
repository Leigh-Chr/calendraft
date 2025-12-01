import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { successSearchSchema } from "@/lib/search-params";

export const Route = createFileRoute("/success")({
	component: SuccessPage,
	validateSearch: zodValidator(successSearchSchema),
	head: () => ({
		meta: [
			{ title: "Paiement réussi - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

function SuccessPage() {
	const { checkout_id } = Route.useSearch();
	const navigate = useNavigate();

	// Auto-redirect to dashboard after 5 seconds
	useEffect(() => {
		const timer = setTimeout(() => {
			navigate({ to: "/dashboard" });
		}, 5000);

		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="container mx-auto px-4 py-12 sm:py-20">
			<div className="mx-auto max-w-2xl">
				<Card className="border-primary/20">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
							<CheckCircle2
								className="size-8 text-primary"
								aria-hidden="true"
							/>
						</div>
						<CardTitle className="text-3xl">Paiement réussi !</CardTitle>
						<CardDescription className="text-base">
							Merci pour votre abonnement. Votre compte a été mis à jour avec
							succès.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-lg bg-muted p-4">
							<p className="font-medium text-sm">Détails de la transaction</p>
							{checkout_id && (
								<p className="mt-1 font-mono text-muted-foreground text-xs">
									ID: {checkout_id}
								</p>
							)}
						</div>
						<div className="space-y-2">
							<p className="font-medium text-sm">Prochaines étapes :</p>
							<ul className="space-y-2 text-muted-foreground text-sm">
								<li className="flex items-start gap-2">
									<span className="mt-0.5">•</span>
									<span>
										Vous pouvez maintenant accéder à toutes les fonctionnalités
										de votre plan.
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-0.5">•</span>
									<span>
										Vos calendriers existants sont automatiquement mis à jour
										avec les nouvelles limites.
									</span>
								</li>
								<li className="flex items-start gap-2">
									<span className="mt-0.5">•</span>
									<span>Vous recevrez un email de confirmation sous peu.</span>
								</li>
							</ul>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col gap-3 sm:flex-row">
						<Button className="w-full sm:w-auto" asChild>
							<Link to="/dashboard">Aller au tableau de bord</Link>
						</Button>
						<Button variant="outline" className="w-full sm:w-auto" asChild>
							<Link to="/calendars">Voir mes calendriers</Link>
						</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
