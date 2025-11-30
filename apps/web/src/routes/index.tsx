import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const navigate = useNavigate();

	return (
		<div className="container mx-auto max-w-3xl px-4 py-10">
			<div className="mb-8 text-center">
				<h1 className="mb-2 font-bold text-4xl">Calendraft</h1>
				<p className="text-muted-foreground">
					Importez, éditez et réorganisez vos calendriers .ics facilement.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card
					className="cursor-pointer transition-shadow hover:shadow-lg"
					onClick={() => navigate({ to: "/calendars/import" })}
				>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="h-5 w-5" />
							Importer un fichier .ics
						</CardTitle>
						<CardDescription>
							Importez un calendrier existant depuis votre appareil
						</CardDescription>
					</CardHeader>
				</Card>

				<Card
					className="cursor-pointer transition-shadow hover:shadow-lg"
					onClick={() => navigate({ to: "/calendars/new" })}
				>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Plus className="h-5 w-5" />
							Créer un calendrier
						</CardTitle>
						<CardDescription>
							Créez un nouveau calendrier vide pour commencer
						</CardDescription>
					</CardHeader>
				</Card>
			</div>

			<div className="mt-8">
				<Button
					variant="outline"
					className="w-full"
					onClick={() => navigate({ to: "/calendars" })}
				>
					Voir mes calendriers
				</Button>
			</div>
		</div>
	);
}
