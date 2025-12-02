import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerStatus } from "@/hooks/use-server-status";
import { useCreateCalendar } from "@/hooks/use-storage";
import { handleTRPCError } from "@/lib/error-handler";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/calendars/new")({
	component: NewCalendarComponent,
	head: () => ({
		meta: [
			{ title: "Créer un calendrier - Calendraft" },
			{
				name: "description",
				content:
					"Créez un nouveau calendrier ICS vierge en quelques secondes. Ajoutez ensuite vos événements et exportez-les vers Google Calendar, Apple Calendar ou Outlook.",
			},
			{ property: "og:title", content: "Créer un calendrier - Calendraft" },
			{
				property: "og:description",
				content: "Créez un nouveau calendrier ICS vierge en quelques secondes.",
			},
			{ property: "og:url", content: `${BASE_URL}/calendars/new` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/calendars/new` }],
	}),
	errorComponent: ({ error }) => {
		if (import.meta.env.DEV) {
			console.error("Route error:", error);
		}
		return (
			<div className="container mx-auto max-w-2xl px-4 py-10">
				<Card className="border-destructive/50 bg-destructive/5">
					<CardHeader>
						<CardTitle className="text-destructive">
							Erreur de chargement
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							{error?.message || "Une erreur est survenue"}
						</p>
					</CardContent>
				</Card>
			</div>
		);
	},
});

function NewCalendarComponent() {
	const navigate = useNavigate();
	const [name, setName] = useState("");
	const [color, setColor] = useState<string | null>("#3B82F6");
	const { createCalendar, isCreating } = useCreateCalendar();
	const { isOffline, isChecking } = useServerStatus();

	const handleCreate = () => {
		// Validation
		if (!name.trim()) {
			toast.error("Le nom du calendrier ne peut pas être vide");
			return;
		}

		// Check server status
		if (isOffline) {
			toast.error("Serveur backend inaccessible", {
				description:
					"Veuillez démarrer le serveur backend avec 'bun run dev:server'",
				duration: 10000,
			});
			return;
		}

		// Create calendar
		createCalendar(
			{ name: name.trim(), color },
			{
				onSuccess: (calendar) => {
					toast.success("Calendrier créé avec succès !");
					navigate({ to: `/calendars/${calendar.id}` });
				},
				onError: (error) => {
					handleTRPCError(error, {
						fallbackTitle: "Erreur lors de la création",
						fallbackDescription:
							"Impossible de créer le calendrier. Veuillez réessayer.",
					});
				},
			},
		);
	};

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
			</div>

			<div className="container mx-auto max-w-2xl px-4 py-10">
				<Card className="card-glow">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5" />
							Créer un nouveau calendrier
						</CardTitle>
						<CardDescription>
							Créez un calendrier vide pour commencer à ajouter des événements
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{isOffline && (
							<div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-destructive text-sm">
								<AlertCircle className="h-4 w-4" />
								<span>
									Le serveur backend n'est pas accessible. Vérifiez qu'il est
									démarré.
								</span>
							</div>
						)}
						{isChecking && (
							<div className="flex items-center gap-2 rounded-lg border p-3 text-muted-foreground text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Vérification de la connexion au serveur...</span>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="name">Nom du calendrier</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Mon calendrier"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleCreate();
									}
								}}
								disabled={isCreating}
							/>
						</div>

						<ColorPicker
							value={color}
							onChange={setColor}
							disabled={isCreating}
							label="Couleur du calendrier"
						/>

						<div className="flex gap-2">
							<Button
								onClick={handleCreate}
								disabled={!name.trim() || isCreating}
								className="interactive-glow flex-1"
							>
								{isCreating ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Création...
									</>
								) : (
									"Créer"
								)}
							</Button>
							<Button
								variant="outline"
								onClick={() => navigate({ to: "/" })}
								disabled={isCreating}
							>
								Annuler
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
