import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Crown, ExternalLink, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	head: () => ({
		meta: [
			{ title: "Tableau de bord - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				search: { mode: "signin", redirect: "/dashboard" },
				throw: true,
			});
		}
		return { session };
	},
});

const planLabels: Record<string, string> = {
	FREE: "Gratuit",
	PERSONAL: "Personnel",
	PRO: "Pro",
};

const statusLabels: Record<string, string> = {
	ACTIVE: "Actif",
	CANCELED: "Annulé",
	PAST_DUE: "En retard",
	INCOMPLETE: "Incomplet",
	INCOMPLETE_EXPIRED: "Incomplet expiré",
	TRIALING: "Essai",
	UNPAID: "Impayé",
};

// Type for subscription data
interface SubscriptionInfo {
	status: string;
	currentPeriodEnd?: string | null;
	cancelAtPeriodEnd?: boolean;
}

interface UsageInfo {
	calendarCount: number;
	maxCalendars: number;
	maxEventsPerCalendar: number;
}

// Sub-component: Plan Card
function PlanCard({
	planType,
	subscription,
	isPro,
	isPersonal,
	isFree,
	onManageSubscription,
}: {
	planType: string;
	subscription: SubscriptionInfo | null | undefined;
	isPro: boolean;
	isPersonal: boolean;
	isFree: boolean;
	onManageSubscription: () => void;
}) {
	return (
		<Card className={isPro ? "border-primary" : ""}>
			<CardHeader>
				<div className="mb-2 flex items-center justify-between">
					<CardTitle>Votre plan</CardTitle>
					{isPro && (
						<Crown className="size-5 text-primary" aria-hidden="true" />
					)}
				</div>
				<CardDescription>Abonnement actuel</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div>
					<Badge
						variant={isPro ? "default" : isPersonal ? "secondary" : "outline"}
						className="text-base"
					>
						{planLabels[planType] || planType}
					</Badge>
				</div>
				{subscription && <SubscriptionDetails subscription={subscription} />}
			</CardContent>
			<CardFooter className="flex flex-col gap-2">
				{isFree ? (
					<Button className="w-full" asChild>
						<Link to="/pricing">Passer à un plan payant</Link>
					</Button>
				) : (
					<Button
						variant="outline"
						className="w-full"
						onClick={onManageSubscription}
					>
						Gérer l'abonnement
						<ExternalLink className="ml-2 size-4" aria-hidden="true" />
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}

// Sub-component: Subscription Details
function SubscriptionDetails({
	subscription,
}: {
	subscription: SubscriptionInfo;
}) {
	return (
		<div className="space-y-1 text-sm">
			<p className="text-muted-foreground">
				Statut:{" "}
				<span className="font-medium">
					{statusLabels[subscription.status] || subscription.status}
				</span>
			</p>
			{subscription.currentPeriodEnd && (
				<p className="text-muted-foreground">
					Renouvellement:{" "}
					<span className="font-medium">
						{new Date(subscription.currentPeriodEnd).toLocaleDateString(
							"fr-FR",
						)}
					</span>
				</p>
			)}
			{subscription.cancelAtPeriodEnd && (
				<p className="text-destructive text-xs">
					Annulation prévue à la fin de la période
				</p>
			)}
		</div>
	);
}

// Sub-component: Usage Card
function UsageCard({ usage }: { usage: UsageInfo | null | undefined }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Utilisation</CardTitle>
				<CardDescription>Vos statistiques d'utilisation</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{usage ? (
					<UsageDetails usage={usage} />
				) : (
					<p className="text-muted-foreground text-sm">Chargement...</p>
				)}
			</CardContent>
		</Card>
	);
}

// Sub-component: Usage Details
function UsageDetails({ usage }: { usage: UsageInfo }) {
	const calendarPercentage =
		usage.maxCalendars === -1
			? 0
			: Math.min((usage.calendarCount / usage.maxCalendars) * 100, 100);

	return (
		<>
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Calendriers</span>
					<span className="font-medium">
						{usage.calendarCount}
						{usage.maxCalendars === -1
							? " / Illimité"
							: ` / ${usage.maxCalendars}`}
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full bg-primary transition-all"
						style={{ width: `${calendarPercentage}%` }}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						Événements par calendrier
					</span>
					<span className="font-medium">
						{usage.maxEventsPerCalendar === -1
							? "Illimité"
							: `Max ${usage.maxEventsPerCalendar}`}
					</span>
				</div>
			</div>
		</>
	);
}

// Sub-component: Profile Card
function ProfileCard({
	userName,
	userEmail,
}: {
	userName?: string;
	userEmail?: string;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Profil</CardTitle>
				<CardDescription>Informations de votre compte</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-sm">
					<strong>Nom :</strong> {userName}
				</p>
				<p className="text-sm">
					<strong>Email :</strong> {userEmail}
				</p>
			</CardContent>
			<CardFooter>
				<Button variant="outline" className="w-full" asChild>
					<Link to="/calendars">Voir mes calendriers</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

// Sub-component: Upgrade Prompt
function UpgradePrompt() {
	return (
		<Card className="mt-6 border-primary/20 bg-primary/5">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<TrendingUp className="size-5 text-primary" aria-hidden="true" />
					Passez à un plan payant
				</CardTitle>
				<CardDescription>
					Débloquez plus de fonctionnalités et de limites
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="space-y-2 text-sm">
					<li>• Plus de calendriers et d'événements</li>
					<li>• Historique étendu ou illimité</li>
					<li>• Gestion avancée des alarmes</li>
					<li>• Support prioritaire</li>
				</ul>
			</CardContent>
			<CardFooter>
				<Button asChild>
					<Link to="/pricing">Voir les plans</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const subscriptionQuery = useQuery(trpc.user.getSubscription.queryOptions());

	const handleManageSubscription = async () => {
		try {
			await authClient.customer.portal();
		} catch (error) {
			console.error("Erreur lors de l'ouverture du portail client:", error);
		}
	};

	const planType = subscriptionQuery.data?.planType || "FREE";
	const usage = subscriptionQuery.data?.usage;
	const subscription = subscriptionQuery.data?.subscription;

	const isPro = planType === "PRO";
	const isPersonal = planType === "PERSONAL";
	const isFree = planType === "FREE";

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-40" />
			</div>

			<div className="container mx-auto max-w-6xl px-4 py-10">
				<div className="mb-8">
					<h1 className="mb-2 font-bold text-3xl">Tableau de bord</h1>
					<p className="text-muted-foreground">
						Bonjour {session.data?.user.name?.split(" ")[0] || "là"} 👋
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<PlanCard
						planType={planType}
						subscription={subscription}
						isPro={isPro}
						isPersonal={isPersonal}
						isFree={isFree}
						onManageSubscription={handleManageSubscription}
					/>
					<UsageCard usage={usage} />
					<ProfileCard
						userName={session.data?.user.name}
						userEmail={session.data?.user.email}
					/>
				</div>

				{isFree && <UpgradePrompt />}
			</div>
		</div>
	);
}
