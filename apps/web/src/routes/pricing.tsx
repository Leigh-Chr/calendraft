import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
	head: () => ({
		meta: [
			{ title: "Tarifs - Calendraft" },
			{
				name: "description",
				content:
					"Choisissez le plan qui vous convient. Gratuit pour commencer, ou passez à un plan payant pour plus de fonctionnalités.",
			},
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

interface Plan {
	name: string;
	slug: string;
	price: string;
	period: string;
	description: string;
	features: string[];
	cta: string;
	ctaLink?: string;
	ctaAction?: string;
	highlighted: boolean;
}

const plans: Plan[] = [
	{
		name: "Gratuit",
		slug: "free",
		price: "0",
		period: "toujours",
		description: "Parfait pour découvrir Calendraft",
		features: [
			"3 calendriers",
			"50 événements par calendrier",
			"Historique 30 jours",
			"Export .ics",
			"Vue calendrier et liste",
			"Mode anonyme disponible",
		],
		cta: "Commencer gratuitement",
		ctaLink: "/calendars",
		highlighted: false,
	},
	{
		name: "Personnel",
		slug: "personal",
		price: "4",
		period: "mois",
		description: "Pour un usage personnel régulier",
		features: [
			"15 calendriers",
			"500 événements par calendrier",
			"Historique 1 an",
			"Gestion des alarmes (affichage, email, audio)",
			"Support email",
		],
		cta: "S'abonner",
		ctaAction: "personal",
		highlighted: true,
	},
	{
		name: "Pro",
		slug: "pro",
		price: "8",
		period: "mois",
		description: "Pour les utilisateurs avancés",
		features: [
			"Calendriers illimités",
			"Événements illimités",
			"Historique illimité",
			"Tout le plan Personnel",
			"Support prioritaire",
		],
		cta: "S'abonner",
		ctaAction: "pro",
		highlighted: false,
	},
];

function PricingPage() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const handleCheckout = async (productSlug: string) => {
		if (!session) {
			navigate({
				to: "/login",
				search: { mode: "signup", redirect: "/pricing" },
			});
			return;
		}

		try {
			await authClient.checkout({
				slug: productSlug,
			});
		} catch (error) {
			console.error("Erreur lors du checkout:", error);
		}
	};

	return (
		<div className="container mx-auto px-4 py-12 sm:py-20">
			{/* Header */}
			<div className="mx-auto mb-16 max-w-3xl text-center">
				<div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
					<Sparkles className="size-4 text-primary" aria-hidden="true" />
					<span className="text-foreground/80">Plans flexibles</span>
				</div>
				<h1 className="mb-4 font-bold text-4xl tracking-tight sm:text-5xl">
					Choisissez votre plan
				</h1>
				<p className="text-lg text-muted-foreground">
					Commencez gratuitement, ou passez à un plan payant pour débloquer plus
					de fonctionnalités.
				</p>
			</div>

			{/* Pricing Cards */}
			<div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
				{plans.map((plan) => (
					<Card
						key={plan.slug}
						className={`relative flex flex-col ${
							plan.highlighted ? "border-2 border-primary shadow-lg" : "border"
						}`}
					>
						{plan.highlighted && (
							<div className="-top-3 -translate-x-1/2 absolute left-1/2">
								<span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground text-xs">
									Populaire
								</span>
							</div>
						)}
						<CardHeader>
							<CardTitle className="text-2xl">{plan.name}</CardTitle>
							<CardDescription>{plan.description}</CardDescription>
							<div className="mt-4">
								<span className="font-bold text-4xl">
									{plan.price === "0" ? "Gratuit" : `€${plan.price}`}
								</span>
								{plan.price !== "0" && (
									<span className="text-muted-foreground text-sm">
										/{plan.period}
									</span>
								)}
							</div>
						</CardHeader>
						<CardContent className="flex-1">
							<ul className="space-y-3">
								{plan.features.map((feature) => (
									<li key={feature} className="flex items-start gap-3">
										<Check
											className="mt-0.5 size-5 shrink-0 text-primary"
											aria-hidden="true"
										/>
										<span className="text-sm">{feature}</span>
									</li>
								))}
							</ul>
						</CardContent>
						<CardFooter>
							{(() => {
								const { ctaAction, ctaLink } = plan;
								if (ctaAction) {
									return (
										<Button
											className="w-full"
											variant={plan.highlighted ? "default" : "outline"}
											size="lg"
											onClick={() => handleCheckout(ctaAction)}
										>
											{plan.cta}
										</Button>
									);
								}
								if (ctaLink) {
									return (
										<Button
											className="w-full"
											variant="outline"
											size="lg"
											asChild
										>
											<Link to={ctaLink}>{plan.cta}</Link>
										</Button>
									);
								}
								return null;
							})()}
						</CardFooter>
					</Card>
				))}
			</div>

			{/* FAQ or additional info */}
			<div className="mx-auto mt-16 max-w-3xl text-center">
				<p className="text-muted-foreground text-sm">
					Tous les plans incluent l'accès à toutes les fonctionnalités de base.
					Vous pouvez annuler votre abonnement à tout moment.
				</p>
			</div>
		</div>
	);
}
