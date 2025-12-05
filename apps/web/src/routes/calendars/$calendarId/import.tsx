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
			{ title: "Import into calendar - Calendraft" },
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
				const message = `${data.importedEvents} event(s) imported.${
					data.skippedDuplicates > 0
						? ` ${data.skippedDuplicates} duplicate(s) skipped.`
						: ""
				}`;
				toast.success(message);
				navigate({ to: `/calendars/${calendarId}` });
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during import";
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
			toast.error("Please select a file");
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
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
			</div>

			<div className="container mx-auto max-w-2xl px-4 py-10">
				<Breadcrumb
					items={[
						{ label: "Calendars", href: "/calendars" },
						{
							label: calendar?.name || "Calendar",
							href: `/calendars/${calendarId}`,
						},
						{ label: "Import" },
					]}
				/>

				<Card className="card-glow mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="h-5 w-5" />
							Import events
						</CardTitle>
						<CardDescription>
							Add events from a .ics file to{" "}
							<span className="font-medium text-foreground">
								{calendar?.name || "this calendar"}
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
									Ignore duplicates (same title and same times)
								</Label>
							</div>
						)}

						{/* Info Card */}
						{file && eventCount > 0 && (
							<div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
								<p className="text-sm">
									<span className="font-medium">{eventCount}</span> event
									{eventCount !== 1 ? "s" : ""} will be added to{" "}
									<span className="font-medium">{calendar?.name}</span>.
								</p>
							</div>
						)}

						{/* Actions */}
						<div className="flex gap-2">
							<Button
								onClick={handleImport}
								disabled={!file || importMutation.isPending}
								className="interactive-glow flex-1"
							>
								{importMutation.isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Importing...
									</>
								) : (
									<>
										Import
										{eventCount > 0 && ` (${eventCount} events)`}
									</>
								)}
							</Button>
							<Button
								variant="outline"
								onClick={() => navigate({ to: `/calendars/${calendarId}` })}
								disabled={importMutation.isPending}
							>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
