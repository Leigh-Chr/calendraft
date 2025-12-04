import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Calendar,
	CalendarCheck,
	Cloud,
	Download,
	FileUp,
	GitMerge,
	Layers,
	Lock,
	Search,
	Smartphone,
	Sparkles,
	Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const BASE_URL = "https://calendraft.app";
const TITLE = "Calendraft - Gérez vos calendriers .ics simplement";
const DESCRIPTION =
	"Importez, créez, modifiez et fusionnez vos calendriers ICS en quelques clics. Compatible Google Calendar, Apple Calendar, Outlook. Gratuit et open-source.";

export const Route = createFileRoute("/")({
	component: LandingPage,
	head: () => ({
		meta: [
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			// Open Graph
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: BASE_URL },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:image", content: `${BASE_URL}/og-image.png` },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:locale", content: "fr_FR" },
			{ property: "og:site_name", content: "Calendraft" },
			// Twitter Card
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:url", content: BASE_URL },
			{ name: "twitter:title", content: TITLE },
			{ name: "twitter:description", content: DESCRIPTION },
			{ name: "twitter:image", content: `${BASE_URL}/og-image.png` },
		],
		links: [{ rel: "canonical", href: BASE_URL }],
	}),
});

function LandingPage() {
	return (
		<div className="flex flex-col">
			{/* Hero Section */}
			<section
				className="relative isolate overflow-hidden"
				aria-labelledby="hero-heading"
			>
				{/* Background effects - Enhanced */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					{/* Aurora gradient mesh */}
					<div className="aurora absolute inset-0" />
					{/* Dot grid pattern - improved */}
					<div className="dot-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
					{/* Primary gradient orb */}
					<div className="-translate-x-1/2 absolute top-0 left-1/2 h-[600px] w-[900px] rounded-full bg-primary/8 blur-[120px]" />
					{/* Secondary accent orb */}
					<div className="absolute top-20 left-[20%] h-[300px] w-[300px] rounded-full bg-chart-3/10 blur-[80px]" />
					{/* Noise texture overlay */}
					<div className="noise-overlay absolute inset-0" />
				</div>

				<div className="container mx-auto px-4 py-24 sm:py-32">
					<div className="mx-auto max-w-3xl text-center">
						{/* Badge */}
						<div className="fade-in slide-in-from-bottom-3 mb-8 inline-flex animate-in items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm duration-500">
							<Sparkles className="size-4 text-primary" aria-hidden="true" />
							<span className="text-foreground/80">
								Application PWA • Fonctionne hors-ligne
							</span>
						</div>

						{/* Main heading */}
						<h1
							id="hero-heading"
							className="fade-in slide-in-from-bottom-4 mb-6 animate-in font-bold text-4xl tracking-tight duration-700 sm:text-5xl lg:text-6xl"
						>
							Vos calendriers{" "}
							<span className="font-mono text-primary">.ics</span>
							<br />
							<span className="gradient-brand">simplifiés</span>
						</h1>

						{/* Subtitle */}
						<p className="fade-in slide-in-from-bottom-5 mx-auto mb-10 max-w-2xl animate-in text-lg text-muted-foreground leading-relaxed duration-1000">
							Importez, créez, modifiez et fusionnez vos calendriers en quelques
							clics. Compatible avec{" "}
							<span className="text-foreground">Google Calendar</span>,{" "}
							<span className="text-foreground">Apple Calendar</span> et{" "}
							<span className="text-foreground">Outlook</span>.
						</p>

						{/* CTA buttons */}
						<div className="fade-in slide-in-from-bottom-6 flex animate-in flex-col items-center justify-center gap-4 duration-1000 sm:flex-row">
							<Button size="lg" className="group h-12 gap-2 px-8" asChild>
								<Link to="/calendars">
									Commencer gratuitement
									<ArrowRight
										className="size-4 transition-transform group-hover:translate-x-1"
										aria-hidden="true"
									/>
								</Link>
							</Button>
							<Button size="lg" variant="outline" className="h-12" asChild>
								<Link to="/calendars/import">
									<FileUp className="mr-2 size-4" aria-hidden="true" />
									Importer un .ics
								</Link>
							</Button>
						</div>

						{/* Trust indicators */}
						<div className="fade-in mt-14 flex animate-in flex-wrap items-center justify-center gap-x-8 gap-y-4 text-muted-foreground text-sm duration-1000">
							<div className="flex items-center gap-2.5">
								<Lock className="size-4 text-primary/70" aria-hidden="true" />
								<span>Données sécurisées</span>
							</div>
							<div className="flex items-center gap-2.5">
								<Smartphone
									className="size-4 text-primary/70"
									aria-hidden="true"
								/>
								<span>PWA installable</span>
							</div>
							<div className="flex items-center gap-2.5">
								<Cloud className="size-4 text-primary/70" aria-hidden="true" />
								<span>Synchronisation cloud</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section - Bento Grid */}
			<section
				className="section-divider relative overflow-hidden bg-muted/30"
				aria-labelledby="features-heading"
			>
				{/* Subtle background pattern */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="cross-grid absolute inset-0 opacity-30" />
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
				</div>
				<div className="container mx-auto px-4 py-20 sm:py-28">
					<div className="mx-auto mb-16 max-w-2xl text-center">
						<h2
							id="features-heading"
							className="mb-4 font-bold text-3xl tracking-tight sm:text-4xl"
						>
							Tout ce dont vous avez besoin
						</h2>
						<p className="text-muted-foreground">
							Des outils puissants pour gérer vos calendriers, sans complexité.
						</p>
					</div>

					{/* Bento Grid */}
					<div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<BentoCard
							icon={FileUp}
							title="Import flexible"
							description="Importez vos fichiers .ics depuis n'importe quelle source. Glissez-déposez ou sélectionnez."
							delay={0}
						/>
						<BentoCard
							icon={GitMerge}
							title="Fusion intelligente"
							description="Combinez plusieurs calendriers en un seul avec détection des doublons."
							delay={50}
						/>
						<BentoCard
							icon={Download}
							title="Export universel"
							description="Exportez vers Google Calendar, Apple Calendar, Outlook et plus."
							delay={100}
						/>
						<BentoCard
							icon={Calendar}
							title="Vues multiples"
							description="Basculez entre vue liste et calendrier mensuel."
							delay={150}
						/>
						<BentoCard
							icon={Search}
							title="Recherche rapide"
							description="Trouvez vos événements par date, mot-clé ou catégorie."
							delay={200}
						/>
						<BentoCard
							icon={Zap}
							title="Mode hors-ligne"
							description="Application PWA qui fonctionne même sans connexion."
							delay={250}
						/>
					</div>
				</div>
			</section>

			{/* How it works Section */}
			<section
				className="section-divider relative"
				aria-labelledby="how-it-works-heading"
			>
				{/* Subtle gradient mesh */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-50" />
				</div>
				<div className="container mx-auto px-4 py-20 sm:py-28">
					<div className="mx-auto mb-16 max-w-2xl text-center">
						<h2
							id="how-it-works-heading"
							className="mb-4 font-bold text-3xl tracking-tight sm:text-4xl"
						>
							Comment ça marche
						</h2>
						<p className="text-muted-foreground">
							Trois étapes simples pour maîtriser vos calendriers.
						</p>
					</div>

					<div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
						<StepCard
							number="01"
							title="Importez ou créez"
							description="Importez un fichier .ics existant ou créez un nouveau calendrier vierge."
							delay={0}
						/>
						<StepCard
							number="02"
							title="Éditez librement"
							description="Ajoutez, modifiez ou supprimez des événements. Fusionnez si besoin."
							delay={100}
						/>
						<StepCard
							number="03"
							title="Exportez partout"
							description="Téléchargez au format .ics, compatible avec toutes les applications."
							delay={200}
						/>
					</div>
				</div>
			</section>

			{/* Anonymous vs Account Section */}
			<section
				className="section-divider relative overflow-hidden bg-muted/30"
				aria-label="Options d'utilisation"
			>
				{/* Background elements */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="cross-grid absolute inset-0 opacity-20" />
					<div className="absolute top-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
					<div className="absolute right-1/4 bottom-0 h-[300px] w-[300px] rounded-full bg-chart-2/5 blur-[80px]" />
				</div>
				<div className="container mx-auto px-4 py-20 sm:py-28">
					<div className="mx-auto max-w-4xl">
						<div className="grid gap-6 md:grid-cols-2">
							{/* Anonymous card */}
							<article className="group card-glow relative overflow-hidden rounded-2xl border bg-card p-8 transition-[border-color,box-shadow] duration-200 hover:border-muted-foreground/20">
								<div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-muted">
									<Zap
										className="size-6 text-muted-foreground"
										aria-hidden="true"
									/>
								</div>
								<h3 className="mb-3 font-semibold text-xl">Mode anonyme</h3>
								<p className="mb-6 text-muted-foreground text-sm leading-relaxed">
									Utilisez Calendraft immédiatement sans créer de compte. Vos
									données restent dans votre navigateur.
								</p>
								<ul className="space-y-3 text-muted-foreground text-sm">
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Aucune inscription requise</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Jusqu'à 10 calendriers</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>500 événements par calendrier</span>
									</li>
								</ul>
							</article>

							{/* Account card - Featured */}
							<article className="group card-glow relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-8 transition-[border-color,box-shadow] duration-200 hover:border-primary/40">
								{/* Recommended badge */}
								<div className="absolute top-6 right-6">
									<span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
										Recommandé
									</span>
								</div>
								<div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
									<Layers className="size-6" aria-hidden="true" />
								</div>
								<h3 className="mb-3 font-semibold text-xl">Avec un compte</h3>
								<p className="mb-6 text-muted-foreground text-sm leading-relaxed">
									Créez un compte gratuit pour synchroniser vos calendriers sur
									tous vos appareils.
								</p>
								<ul className="space-y-3 text-muted-foreground text-sm">
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Jusqu'à 100 calendriers</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>2 000 événements par calendrier</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Synchronisation multi-appareils</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Sauvegarde cloud permanente</span>
									</li>
								</ul>
							</article>
						</div>
					</div>
				</div>
			</section>

			{/* Final CTA Section */}
			<section
				className="section-divider relative overflow-hidden"
				aria-labelledby="cta-heading"
			>
				{/* Enhanced background effects */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="aurora absolute inset-0 opacity-70" />
					<div className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
					<div className="dot-grid absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_40%,transparent_100%)]" />
				</div>

				<div className="container mx-auto px-4 py-20 sm:py-28">
					<div className="mx-auto max-w-2xl text-center">
						<h2
							id="cta-heading"
							className="mb-6 font-bold text-3xl tracking-tight sm:text-4xl"
						>
							Prêt à simplifier vos calendriers ?
						</h2>
						<p className="mb-10 text-muted-foreground">
							Commencez dès maintenant, gratuitement et sans inscription.
						</p>
						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Button size="lg" className="group h-12 gap-2 px-8" asChild>
								<Link to="/calendars/new">
									Créer un calendrier
									<ArrowRight
										className="size-4 transition-transform group-hover:translate-x-1"
										aria-hidden="true"
									/>
								</Link>
							</Button>
							<Button size="lg" variant="outline" className="h-12" asChild>
								<Link to="/login" search={{ mode: "signup" }}>
									Créer un compte gratuit
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="section-divider relative overflow-hidden bg-muted/30">
				{/* Subtle background */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="cross-grid absolute inset-0 opacity-20" />
				</div>
				<div className="container mx-auto px-4 py-12">
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
						{/* Brand */}
						<div className="sm:col-span-2 lg:col-span-1">
							<Link
								to="/"
								className="mb-4 inline-flex items-center gap-2 font-semibold"
								aria-label="Calendraft - Accueil"
							>
								<Calendar className="size-5 text-primary" aria-hidden="true" />
								<span>Calendraft</span>
							</Link>
							<p className="text-muted-foreground text-sm leading-relaxed">
								Gérez vos calendriers{" "}
								<span className="font-mono text-primary">.ics</span> simplement.
							</p>
						</div>

						{/* Product navigation */}
						<nav aria-label="Liens produit">
							<p className="mb-4 font-medium text-sm" id="footer-product">
								Produit
							</p>
							<ul
								className="space-y-2.5 text-muted-foreground text-sm"
								aria-labelledby="footer-product"
							>
								<li>
									<Link
										to="/calendars"
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Mes calendriers
									</Link>
								</li>
								<li>
									<Link
										to="/calendars/new"
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Créer un calendrier
									</Link>
								</li>
								<li>
									<Link
										to="/calendars/import"
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Importer un .ics
									</Link>
								</li>
							</ul>
						</nav>

						{/* Account navigation */}
						<nav aria-label="Liens compte">
							<p className="mb-4 font-medium text-sm" id="footer-account">
								Compte
							</p>
							<ul
								className="space-y-2.5 text-muted-foreground text-sm"
								aria-labelledby="footer-account"
							>
								<li>
									<Link
										to="/login"
										search={{ mode: "signin" }}
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Connexion
									</Link>
								</li>
								<li>
									<Link
										to="/login"
										search={{ mode: "signup" }}
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Créer un compte
									</Link>
								</li>
							</ul>
						</nav>

						{/* Open Source info */}
						<div>
							<p className="mb-4 font-medium text-sm">Open Source</p>
							<p className="text-muted-foreground text-sm leading-relaxed">
								Calendraft est 100% gratuit et open-source sous licence MIT.
							</p>
						</div>
					</div>

					{/* Copyright */}
					<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
						<p className="text-muted-foreground text-sm">
							© {new Date().getFullYear()} Calendraft
						</p>
						<p className="text-muted-foreground/60 text-xs">
							Fait avec soin pour simplifier vos calendriers
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

interface CardProps {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
	title: string;
	description: string;
	delay?: number;
}

function BentoCard({ icon: Icon, title, description, delay = 0 }: CardProps) {
	return (
		<article
			className="card-gradient-border group card-glow fade-in slide-in-from-bottom-4 relative animate-in overflow-hidden rounded-xl border bg-card p-6 transition-all duration-200 hover:border-primary/30"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
		>
			<div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
			<div className="relative">
				<div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-muted transition-all duration-200 group-hover:bg-primary/10 group-hover:shadow-lg group-hover:shadow-primary/10">
					<Icon
						className="size-5 text-muted-foreground transition-colors duration-200 group-hover:text-primary"
						aria-hidden
					/>
				</div>
				<h3 className="mb-2 font-semibold">{title}</h3>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{description}
				</p>
			</div>
		</article>
	);
}

function StepCard({
	number,
	title,
	description,
	delay = 0,
}: {
	number: string;
	title: string;
	description: string;
	delay?: number;
}) {
	return (
		<div
			className="group fade-in slide-in-from-bottom-4 relative animate-in text-center"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
		>
			<div
				className="step-number mb-4 text-6xl transition-all duration-300 group-hover:scale-105 sm:text-7xl"
				aria-hidden="true"
			>
				{number}
			</div>
			<div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
			<h3 className="mb-2 font-semibold text-lg">{title}</h3>
			<p className="text-muted-foreground text-sm leading-relaxed">
				{description}
			</p>
		</div>
	);
}
