import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FileDropZone } from "@/components/file-drop-zone";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/calendars/import")({
	component: ImportCalendarComponent,
	head: () => ({
		meta: [
			{ title: "Importer un calendrier .ics - Calendraft" },
			{
				name: "description",
				content:
					"Importez un fichier calendrier ICS depuis votre appareil. Compatible avec les exports de Google Calendar, Apple Calendar, Outlook et tous les formats iCalendar standard.",
			},
			{
				property: "og:title",
				content: "Importer un calendrier .ics - Calendraft",
			},
			{
				property: "og:description",
				content: "Importez un fichier calendrier ICS depuis votre appareil.",
			},
			{ property: "og:url", content: `${BASE_URL}/calendars/import` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/calendars/import` }],
	}),
});

function ImportCalendarComponent() {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [calendarName, setCalendarName] = useState("");
	const [eventCount, setEventCount] = useState(0);

	const importMutation = useMutation(
		trpc.calendar.importIcs.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`Calendrier importé avec succès ! ${data.importedEvents} événement(s) importé(s).`,
				);
				navigate({ to: `/calendars/${data.calendar.id}` });
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Erreur lors de l'import";
				toast.error(message);
			},
		}),
	);

	const handleFileSelect = (selectedFile: File) => {
		setFile(selectedFile);
		// Suggest calendar name from file name
		const suggestedName = selectedFile.name
			.replace(/\.ics$/i, "")
			.replace(/[-_]/g, " ")
			.replace(/\b\w/g, (l) => l.toUpperCase());
		if (!calendarName) {
			setCalendarName(suggestedName);
		}
	};

	const handlePreviewParsed = (events: Array<{ title: string }>) => {
		setEventCount(events.length);
	};

	const handleImport = async () => {
		if (!file) {
			toast.error("Veuillez sélectionner un fichier");
			return;
		}

		const content = await file.text();
		importMutation.mutate({
			fileContent: content,
			name: calendarName || undefined,
		});
	};

	return (
		<div className="container mx-auto max-w-2xl px-4 py-10">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Upload className="h-5 w-5" />
						Importer un calendrier .ics
					</CardTitle>
					<CardDescription>
						Importez un fichier calendrier depuis votre appareil. Compatible
						avec Google Calendar, Apple Calendar, Outlook et tous les formats
						iCalendar.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Drop Zone */}
					<FileDropZone
						onFileSelect={handleFileSelect}
						onPreviewParsed={handlePreviewParsed}
						disabled={importMutation.isPending}
					/>

					{/* Calendar Name */}
					{file && (
						<div className="space-y-2">
							<Label htmlFor="name">Nom du calendrier</Label>
							<Input
								id="name"
								value={calendarName}
								onChange={(e) => setCalendarName(e.target.value)}
								placeholder="Mon calendrier importé"
								disabled={importMutation.isPending}
							/>
							<p className="text-muted-foreground text-xs">
								Laissez vide pour utiliser le nom du fichier
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="flex gap-2">
						<Button
							onClick={handleImport}
							disabled={!file || importMutation.isPending}
							className="flex-1"
						>
							{importMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Import en cours...
								</>
							) : (
								<>
									Importer
									{eventCount > 0 && ` (${eventCount} événements)`}
								</>
							)}
						</Button>
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/calendars" })}
							disabled={importMutation.isPending}
						>
							Annuler
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
