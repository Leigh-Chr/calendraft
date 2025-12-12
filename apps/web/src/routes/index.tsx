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
const TITLE = "Calendraft - Calendar management simplified";
const DESCRIPTION =
	"Free, open-source calendar manager. Import, edit, merge your calendar files in seconds. No account required, works offline.";

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
			{ property: "og:locale", content: "en_US" },
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
					{/* Aurora gradient mesh avec grain intégré */}
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
						<div className="fade-in slide-in-from-bottom-3 mb-8 inline-flex animate-in items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-small duration-500">
							<Sparkles className="size-4 text-primary" aria-hidden="true" />
							<span className="text-foreground/80">
								Free & Open Source • No Account Required • Works Offline
							</span>
						</div>

						{/* Main heading */}
						<h1
							id="hero-heading"
							className="fade-in slide-in-from-bottom-4 mb-6 animate-in text-hero duration-700"
						>
							Calendar management,
							<br />
							<span className="bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">
								simplified
							</span>
						</h1>

						{/* Subtitle */}
						<p className="fade-in slide-in-from-bottom-5 mx-auto mb-10 max-w-2xl animate-in text-body-large text-muted-foreground duration-1000">
							Import, create, edit, and merge your calendars in just a few
							clicks. Works with{" "}
							<span className="font-medium text-foreground">
								Google Calendar
							</span>
							,{" "}
							<span className="font-medium text-foreground">
								Apple Calendar
							</span>
							, and <span className="font-medium text-foreground">Outlook</span>
							.
						</p>

						{/* CTA buttons */}
						<div className="fade-in slide-in-from-bottom-6 flex animate-in flex-col items-center justify-center gap-4 duration-1000 sm:flex-row">
							<Button size="lg" className="group h-12 gap-2 px-8" asChild>
								<Link to="/calendars">
									Get started for free
									<ArrowRight
										className="size-4 transition-transform group-hover:translate-x-1"
										aria-hidden="true"
									/>
								</Link>
							</Button>
							<Button size="lg" variant="outline" className="h-12" asChild>
								<Link to="/calendars/import">
									<FileUp className="mr-2 size-4" aria-hidden="true" />
									Import calendar
								</Link>
							</Button>
						</div>

						{/* Trust indicators */}
						<div className="fade-in mt-14 flex animate-in flex-wrap items-center justify-center gap-x-8 gap-y-4 text-muted-foreground text-small duration-1000">
							<div className="flex items-center gap-2.5">
								<Lock className="size-4 text-primary/70" aria-hidden="true" />
								<span>Secure data</span>
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
								<span>Cloud synchronization</span>
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
				{/* Subtle background pattern avec grain */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="cross-grid absolute inset-0 opacity-30" />
					<div className="grain-texture absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
				</div>
				<div className="container mx-auto px-4 py-20 sm:py-24">
					<div className="mx-auto mb-16 max-w-2xl text-center">
						<h2 id="features-heading" className="mb-8 text-display">
							Simple, powerful features
						</h2>
						<p className="text-muted-foreground">
							Powerful tools to manage your calendars, without complexity.
						</p>
					</div>

					{/* Bento Grid */}
					<div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<BentoCard
							icon={FileUp}
							title="Import flexible"
							description="Import calendar files from any source. Drag and drop or select."
							delay={0}
						/>
						<BentoCard
							icon={GitMerge}
							title="Smart Merge"
							description="Combine multiple calendars into one with duplicate detection."
							delay={50}
						/>
						<BentoCard
							icon={Download}
							title="Universal Export"
							description="Export to Google Calendar, Apple Calendar, Outlook, and more."
							delay={100}
						/>
						<BentoCard
							icon={Calendar}
							title="Multiple Views"
							description="Switch between list view and monthly calendar."
							delay={150}
						/>
						<BentoCard
							icon={Search}
							title="Quick Search"
							description="Find your events by date, keyword, or category."
							delay={200}
						/>
						<BentoCard
							icon={Zap}
							title="Offline Mode"
							description="Works offline—access your calendars anywhere, anytime."
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
				{/* Ruled paper pattern + gradient mesh avec grain */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="ruled-pattern absolute inset-0 opacity-40" />
					<div className="gradient-mesh grain-texture absolute inset-0 opacity-40" />
				</div>
				<div className="container mx-auto px-4 py-20 sm:py-24">
					<div className="mx-auto mb-12 max-w-2xl text-center">
						<h2 id="how-it-works-heading" className="mb-8 text-display">
							How it works
						</h2>
						<p className="text-muted-foreground">
							Three simple steps to master your calendars.
						</p>
					</div>

					<div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
						<StepCard
							number="01"
							title="Import or create"
							description="Import an existing calendar file or create a new empty calendar."
							delay={0}
						/>
						<StepCard
							number="02"
							title="Edit freely"
							description="Add, modify, or delete events. Merge if needed."
							delay={100}
						/>
						<StepCard
							number="03"
							title="Export anywhere"
							description="Download in .ics format, works with all applications."
							delay={200}
						/>
					</div>
				</div>
			</section>

			{/* Anonymous vs Account Section */}
			<section
				className="section-divider relative overflow-hidden bg-muted/30"
				aria-label="Usage options"
			>
				{/* Background elements avec grain */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="cross-grid absolute inset-0 opacity-20" />
					<div className="grain-texture absolute inset-0" />
					<div className="absolute top-1/2 left-1/4 h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
					<div className="absolute right-1/4 bottom-0 h-[300px] w-[300px] rounded-full bg-chart-2/5 blur-[80px]" />
				</div>
				<div className="container mx-auto px-4 py-20 sm:py-24">
					<div className="mx-auto max-w-4xl">
						<div className="grid gap-6 md:grid-cols-2">
							{/* Anonymous card */}
							<article className="group relative overflow-hidden rounded-2xl border bg-card p-8 transition-all duration-200 hover:border-muted-foreground/20 hover:shadow-lg">
								<div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-muted">
									<Zap
										className="size-6 text-muted-foreground"
										aria-hidden="true"
									/>
								</div>
								<h3 className="mb-4 text-heading-3">Anonymous Mode</h3>
								<p className="mb-6 text-body text-muted-foreground">
									Use Calendraft immediately without creating an account. Your
									data stays in your browser.
								</p>
								<ul className="space-y-3 text-body text-muted-foreground">
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>No registration required</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Up to 10 calendars</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>500 events per calendar</span>
									</li>
								</ul>
							</article>

							{/* Account card - Featured */}
							<article className="group relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-card p-8 transition-all duration-200 hover:border-primary/40 hover:shadow-lg">
								{/* Recommended badge */}
								<div className="absolute top-6 right-6">
									<span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
										Recommended
									</span>
								</div>
								<div className="mb-6 inline-flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
									<Layers className="size-6" aria-hidden="true" />
								</div>
								<h3 className="mb-4 text-heading-3">With an account</h3>
								<p className="mb-6 text-body text-muted-foreground">
									Create a free account to sync your calendars across all your
									devices.
								</p>
								<ul className="space-y-3 text-body text-muted-foreground">
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Up to 100 calendars</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>2,000 events per calendar</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Multi-device synchronization</span>
									</li>
									<li className="flex items-center gap-3">
										<CalendarCheck
											className="size-4 text-primary"
											aria-hidden="true"
										/>
										<span>Permanent cloud backup</span>
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

				<div className="container mx-auto px-4 py-20 sm:py-24">
					<div className="mx-auto max-w-2xl text-center">
						<h2 id="cta-heading" className="mb-8 text-display">
							Ready to simplify your calendars?
						</h2>
						<p className="mb-10 text-muted-foreground">
							Start now, free and without registration.
						</p>
						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
							<Button size="lg" className="group h-12 gap-2 px-8" asChild>
								<Link to="/calendars/new">
									Create a calendar
									<ArrowRight
										className="size-4 transition-transform group-hover:translate-x-1"
										aria-hidden="true"
									/>
								</Link>
							</Button>
							<Button size="lg" variant="outline" className="h-12" asChild>
								<Link to="/login" search={{ mode: "signup" }}>
									Create a free account
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
								aria-label="Calendraft - Home"
							>
								<Calendar className="size-5 text-primary" aria-hidden="true" />
								<span>Calendraft</span>
							</Link>
							<p className="text-body text-muted-foreground">
								Manage your calendars simply.
							</p>
						</div>

						{/* Product navigation */}
						<nav aria-label="Product links">
							<p className="mb-4 font-medium text-small" id="footer-product">
								Product
							</p>
							<ul
								className="space-y-3 text-muted-foreground text-sm"
								aria-labelledby="footer-product"
							>
								<li>
									<Link
										to="/calendars"
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										My calendars
									</Link>
								</li>
								<li>
									<Link
										to="/calendars/new"
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Create a calendar
									</Link>
								</li>
								<li>
									<Link
										to="/calendars/import"
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Import calendar
									</Link>
								</li>
							</ul>
						</nav>

						{/* Account navigation */}
						<nav aria-label="Account links">
							<p className="mb-4 font-medium text-small" id="footer-account">
								Account
							</p>
							<ul
								className="space-y-3 text-muted-foreground text-sm"
								aria-labelledby="footer-account"
							>
								<li>
									<Link
										to="/login"
										search={{ mode: "signin" }}
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Sign in
									</Link>
								</li>
								<li>
									<Link
										to="/login"
										search={{ mode: "signup" }}
										className="rounded-sm transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
									>
										Create an account
									</Link>
								</li>
							</ul>
						</nav>

						{/* Open Source info */}
						<div>
							<p className="mb-4 font-medium text-small">Open Source</p>
							<p className="text-body text-muted-foreground">
								Calendraft is 100% free and open-source under the MIT license.
							</p>
						</div>
					</div>

					{/* Copyright */}
					<div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
						<p className="text-muted-foreground text-sm">
							© {new Date().getFullYear()} Calendraft
						</p>
						<p className="text-muted-foreground/60 text-xs">
							Made with care to simplify your calendars
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
			className="group fade-in slide-in-from-bottom-4 hover:-translate-y-1 relative animate-in overflow-hidden rounded-xl border bg-card p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-lg"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
		>
			<div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/8 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
			<div className="relative">
				<div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-muted transition-all duration-200 group-hover:bg-primary/15 group-hover:shadow-lg group-hover:shadow-primary/20">
					<Icon
						className="size-5 text-muted-foreground transition-colors duration-200 group-hover:text-primary"
						aria-hidden
					/>
				</div>
				<h3 className="mb-4 text-heading-3">{title}</h3>
				<p className="text-body text-muted-foreground">{description}</p>
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
			<h3 className="mb-4 text-heading-3">{title}</h3>
			<p className="text-body text-muted-foreground">{description}</p>
		</div>
	);
}
