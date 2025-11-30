import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/import")({
	component: ImportCalendarComponent,
});

function ImportCalendarComponent() {
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [calendarName, setCalendarName] = useState("");
	const [preview, setPreview] = useState<{
		eventCount: number;
		dateRange: string;
		warnings: string[];
	} | null>(null);

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

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (!selectedFile) return;

		if (!selectedFile.name.endsWith(".ics")) {
			toast.error("Le fichier doit être au format .ics");
			return;
		}

		// Validate file size (5MB max)
		const maxSizeBytes = 5 * 1024 * 1024; // 5MB
		if (selectedFile.size > maxSizeBytes) {
			toast.error(
				`Fichier trop volumineux. Taille maximale autorisée : 5MB. Taille actuelle : ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`,
			);
			return;
		}

		setFile(selectedFile);

		// Read and preview file
		const reader = new FileReader();
		reader.onload = async (event) => {
			const content = event.target?.result as string;
			try {
				// Parse to get preview (we'll use a simple approach)
				const lines = content.split("\n");
				const events = lines.filter((line) =>
					line.trim().startsWith("BEGIN:VEVENT"),
				).length;

				// Try to extract date range (simplified)
				const dtstartLines = lines.filter((line) =>
					line.trim().startsWith("DTSTART"),
				);
				const dtendLines = lines.filter((line) =>
					line.trim().startsWith("DTEND"),
				);

				let dateRange = "Non disponible";
				if (dtstartLines.length > 0 && dtendLines.length > 0) {
					// Extract first and last dates (simplified)
					dateRange = `${events} événement(s) détecté(s)`;
				}

				setPreview({
					eventCount: events,
					dateRange,
					warnings: [],
				});
			} catch (_error) {
				toast.error("Erreur lors de la lecture du fichier");
			}
		};
		reader.readAsText(selectedFile);
	};

	const handleImport = async () => {
		if (!file) {
			toast.error("Veuillez sélectionner un fichier");
			return;
		}

		const reader = new FileReader();
		reader.onload = async (event) => {
			const content = event.target?.result as string;
			importMutation.mutate({
				fileContent: content,
				name: calendarName || undefined,
			});
		};
		reader.readAsText(file);
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
						Importez un fichier calendrier depuis votre appareil
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="file">Fichier .ics</Label>
						<Input
							id="file"
							type="file"
							accept=".ics"
							onChange={handleFileChange}
							disabled={importMutation.isPending}
						/>
					</div>

					{file && (
						<div className="space-y-2">
							<Label htmlFor="name">Nom du calendrier (optionnel)</Label>
							<Input
								id="name"
								value={calendarName}
								onChange={(e) => setCalendarName(e.target.value)}
								placeholder={`Calendrier importé - ${new Date().toLocaleDateString()}`}
								disabled={importMutation.isPending}
							/>
						</div>
					)}

					{preview && (
						<div className="rounded-lg border p-4">
							<h3 className="mb-2 font-medium">Aperçu</h3>
							<p className="text-muted-foreground text-sm">
								{preview.eventCount} événement(s) détecté(s)
							</p>
							{preview.warnings.length > 0 && (
								<div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-destructive text-sm">
									{preview.warnings.map((warning) => (
										<p key={warning}>{warning}</p>
									))}
								</div>
							)}
						</div>
					)}

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
								"Importer"
							)}
						</Button>
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/" })}
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
