import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/breadcrumb";
import { FileDropZone } from "@/components/file-drop-zone";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/$calendarId/import")({
	component: ImportIntoCalendarComponent,
	head: () => ({
		meta: [
			{ title: "Importer dans le calendrier - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

function ImportIntoCalendarComponent() {
	const { calendarId } = Route.useParams();
	const navigate = useNavigate();
	const [file, setFile] = useState<File | null>(null);
	const [removeDuplicates, setRemoveDuplicates] = useState(true);
	const [eventCount, setEventCount] = useState(0);

	// Fetch calendar to display its name
	const { data: calendar } = useQuery({
		...trpc.calendar.getById.queryOptions({ id: calendarId }),
		enabled: !!calendarId,
	});

	const importMutation = useMutation(
		trpc.calendar.importIcsIntoCalendar.mutationOptions({
			onSuccess: (data) => {
				const message = `${data.importedEvents} événement(s) importé(s).${
					data.skippedDuplicates > 0
						? ` ${data.skippedDuplicates} doublon(s) ignoré(s).`
						: ""
				}`;
				toast.success(message);
				navigate({ to: `/calendars/${calendarId}` });
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
			calendarId,
			fileContent: content,
			removeDuplicates,
		});
	};

	return (
		<div className="container mx-auto max-w-2xl px-4 py-10">
			<Breadcrumb
				items={[
					{ label: "Calendriers", href: "/calendars" },
					{
						label: calendar?.name || "Calendrier",
						href: `/calendars/${calendarId}`,
					},
					{ label: "Importer" },
				]}
			/>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Upload className="h-5 w-5" />
						Importer des événements
					</CardTitle>
					<CardDescription>
						Ajoutez des événements d'un fichier .ics à{" "}
						<span className="font-medium text-foreground">
							{calendar?.name || "ce calendrier"}
						</span>
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Drop Zone */}
					<FileDropZone
						onFileSelect={handleFileSelect}
						onPreviewParsed={handlePreviewParsed}
						disabled={importMutation.isPending}
					/>

					{/* Options */}
					{file && (
						<div className="flex items-center space-x-2">
							<Checkbox
								id="remove-duplicates"
								checked={removeDuplicates}
								onCheckedChange={(checked) =>
									setRemoveDuplicates(checked as boolean)
								}
								disabled={importMutation.isPending}
							/>
							<Label
								htmlFor="remove-duplicates"
								className="cursor-pointer font-normal text-sm"
							>
								Ignorer les doublons (même titre et mêmes horaires)
							</Label>
						</div>
					)}

					{/* Info Card */}
					{file && eventCount > 0 && (
						<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
							<p className="text-sm">
								<span className="font-medium">{eventCount}</span> événement
								{eventCount !== 1 ? "s" : ""} sera
								{eventCount !== 1 ? "ont" : ""} ajouté
								{eventCount !== 1 ? "s" : ""} à{" "}
								<span className="font-medium">{calendar?.name}</span>.
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
							onClick={() => navigate({ to: `/calendars/${calendarId}` })}
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
