/**
 * Component to prompt anonymous users to create an account
 * Displays usage limits and benefits of creating an account
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
// Using Card instead of Alert since Alert component doesn't exist
import { Infinity as InfinityIcon, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useIsAuthenticated } from "@/hooks/use-storage";
import { trpc } from "@/utils/trpc";

interface AccountPromptProps {
	variant?: "banner" | "card";
	showUsage?: boolean;
}

export function AccountPrompt({
	variant = "banner",
	showUsage = true,
}: AccountPromptProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const isAuthenticated = useIsAuthenticated();

	// Only show for anonymous users
	const { data: usage } = useQuery({
		...trpc.calendar.getUsage.queryOptions(),
		enabled: !isAuthenticated && showUsage,
	});

	if (isAuthenticated) {
		return null; // Don't show for authenticated users
	}

	const isNearLimit =
		usage &&
		(usage.calendarCount >= usage.maxCalendars * 0.8 ||
			Object.values(usage.eventCounts).some(
				(count) => count >= usage.maxEventsPerCalendar * 0.8,
			));

	if (variant === "banner") {
		return (
			<Card className="mb-4 border-primary/20 bg-primary/5">
				<CardContent className="pt-6">
					<div className="flex items-start justify-between gap-4">
						<div className="flex-1">
							<div className="mb-2 flex items-center gap-2">
								<UserPlus className="h-4 w-4 text-primary" />
								<h3 className="font-semibold">Mode anonyme actif</h3>
							</div>
							<p className="text-muted-foreground text-sm">
								{usage ? (
									<>
										Vous utilisez {usage.calendarCount}/{usage.maxCalendars}{" "}
										calendriers.
										{isNearLimit && (
											<span className="ml-2 font-semibold text-destructive">
												Limite proche !
											</span>
										)}{" "}
										<strong className="text-foreground">⚠️ Important :</strong>{" "}
										Vos calendriers sont liés à ce navigateur. Si vous effacez
										les données du navigateur ou utilisez la navigation privée,
										vous perdrez l'accès à vos calendriers. Créez un compte pour
										sauvegarder vos données de manière permanente.
									</>
								) : (
									<>
										<strong className="text-foreground">⚠️ Important :</strong>{" "}
										En mode anonyme, vos calendriers sont liés à ce navigateur.
										Si vous effacez les données du navigateur, vous perdrez
										l'accès à vos calendriers. Créez un compte pour sauvegarder
										vos données de manière permanente et accéder à vos
										calendriers depuis n'importe quel appareil.
									</>
								)}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								navigate({
									to: "/login",
									search: { mode: "signup", redirect: location.pathname },
								})
							}
						>
							Créer un compte
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mb-4 border-primary/20 bg-primary/5">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<UserPlus className="h-5 w-5 text-primary" />
					Créez un compte gratuit
				</CardTitle>
				<CardDescription>
					Débloquez toutes les fonctionnalités de Calendraft
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{usage && (
					<div className="rounded-lg border border-border bg-card p-3">
						<p className="mb-2 font-medium text-sm">
							Votre utilisation actuelle :
						</p>
						<ul className="space-y-1 text-muted-foreground text-sm">
							<li>
								Calendriers : {usage.calendarCount}/{usage.maxCalendars}
								{isNearLimit && (
									<span className="ml-2 font-semibold text-destructive">
										⚠️ Limite proche
									</span>
								)}
							</li>
							{Object.entries(usage.eventCounts).map(([calId, count]) => (
								<li key={calId}>
									Événements : {count}/{usage.maxEventsPerCalendar}
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="space-y-2">
					<div className="flex items-start gap-2 text-sm">
						<InfinityIcon className="mt-0.5 h-4 w-4 text-primary" />
						<span>Limites illimitées</span>
					</div>
					<div className="flex items-start gap-2 text-sm">
						<Sparkles className="mt-0.5 h-4 w-4 text-primary" />
						<span>Synchronisation multi-appareils</span>
					</div>
					<div className="flex items-start gap-2 text-sm">
						<UserPlus className="mt-0.5 h-4 w-4 text-primary" />
						<span>Accès depuis n'importe où</span>
					</div>
				</div>

				<Button
					className="w-full"
					onClick={() =>
						navigate({
							to: "/login",
							search: { mode: "signup", redirect: location.pathname },
						})
					}
				>
					Créer un compte gratuit
				</Button>
			</CardContent>
		</Card>
	);
}
