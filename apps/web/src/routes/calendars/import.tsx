import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Globe, Loader2, Upload } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
					"Importez un fichier calendrier ICS depuis votre appareil ou depuis une URL. Compatible avec les exports de Google Calendar, Apple Calendar, Outlook et tous les formats iCalendar standard.",
			},
			{
				property: "og:title",
				content: "Importer un calendrier .ics - Calendraft",
			},
			{
				property: "og:description",
				content:
					"Importez un fichier calendrier ICS depuis votre appareil ou une URL.",
			},
			{ property: "og:url", content: `${BASE_URL}/calendars/import` },
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/calendars/import` }],
	}),
});

function ImportCalendarComponent() {
	const navigate = useNavigate();

	// File import state
	const [file, setFile] = useState<File | null>(null);
	const [calendarName, setCalendarName] = useState("");
	const [eventCount, setEventCount] = useState(0);

	// URL import state
	const [url, setUrl] = useState("");
	const [urlCalendarName, setUrlCalendarName] = useState("");

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

	const importFromUrlMutation = useMutation(
		trpc.calendar.importFromUrl.mutationOptions({
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

	const handleImportFromUrl = () => {
		if (!url.trim()) {
			toast.error("Veuillez entrer une URL");
			return;
		}

		importFromUrlMutation.mutate({
			url: url.trim(),
			name: urlCalendarName || undefined,
		});
	};

	const isPending = importMutation.isPending || importFromUrlMutation.isPending;

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
							<Upload className="h-5 w-5" />
							Importer un calendrier .ics
						</CardTitle>
						<CardDescription>
							Importez un fichier calendrier depuis votre appareil ou depuis une
							URL. Compatible avec Google Calendar, Apple Calendar, Outlook et
							tous les formats iCalendar.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="file" className="w-full">
							<TabsList className="mb-6 grid w-full grid-cols-2">
								<TabsTrigger value="file" disabled={isPending}>
									<Upload className="mr-2 h-4 w-4" />
									Depuis un fichier
								</TabsTrigger>
								<TabsTrigger value="url" disabled={isPending}>
									<Globe className="mr-2 h-4 w-4" />
									Depuis une URL
								</TabsTrigger>
							</TabsList>

							{/* File import tab */}
							<TabsContent value="file" className="space-y-6">
								<FileDropZone
									onFileSelect={handleFileSelect}
									onPreviewParsed={handlePreviewParsed}
									disabled={isPending}
								/>

								{file && (
									<div className="space-y-2">
										<Label htmlFor="name">Nom du calendrier</Label>
										<Input
											id="name"
											value={calendarName}
											onChange={(e) => setCalendarName(e.target.value)}
											placeholder="Mon calendrier importé"
											disabled={isPending}
										/>
										<p className="text-muted-foreground text-xs">
											Laissez vide pour utiliser le nom du fichier
										</p>
									</div>
								)}

								<div className="flex gap-2">
									<Button
										onClick={handleImport}
										disabled={!file || isPending}
										className="interactive-glow flex-1"
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
										disabled={isPending}
									>
										Annuler
									</Button>
								</div>
							</TabsContent>

							{/* URL import tab */}
							<TabsContent value="url" className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="url">URL du calendrier</Label>
									<Input
										id="url"
										type="url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://calendar.google.com/calendar/ical/..."
										disabled={isPending}
									/>
									<p className="text-muted-foreground text-xs">
										Collez l'URL publique de votre calendrier (format ICS/iCal)
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="url-name">
										Nom du calendrier (optionnel)
									</Label>
									<Input
										id="url-name"
										value={urlCalendarName}
										onChange={(e) => setUrlCalendarName(e.target.value)}
										placeholder="Mon calendrier"
										disabled={isPending}
									/>
								</div>

								{/* Help text */}
								<div className="rounded-lg bg-muted/50 p-4 text-sm">
									<p className="mb-2 font-medium">
										Où trouver l'URL de votre calendrier ?
									</p>
									<ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
										<li>
											<strong>Google Calendar</strong> : Paramètres du
											calendrier → Intégrer le calendrier → Adresse secrète au
											format iCal
										</li>
										<li>
											<strong>Apple iCloud</strong> : Partage du calendrier →
											Calendrier public → Copier le lien
										</li>
										<li>
											<strong>Outlook</strong> : Paramètres du calendrier →
											Calendriers partagés → Publier un calendrier
										</li>
									</ul>
								</div>

								<div className="flex gap-2">
									<Button
										onClick={handleImportFromUrl}
										disabled={!url.trim() || isPending}
										className="interactive-glow flex-1"
									>
										{importFromUrlMutation.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Import en cours...
											</>
										) : (
											<>
												<Globe className="mr-2 h-4 w-4" />
												Importer depuis l'URL
											</>
										)}
									</Button>
									<Button
										variant="outline"
										onClick={() => navigate({ to: "/calendars" })}
										disabled={isPending}
									>
										Annuler
									</Button>
								</div>

								<p className="text-center text-muted-foreground text-xs">
									💡 Vous pourrez actualiser ce calendrier depuis l'URL plus
									tard
								</p>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
