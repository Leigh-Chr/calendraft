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
			{ title: "Import a .ics calendar - Calendraft" },
			{
				name: "description",
				content:
					"Import an ICS calendar file from your device or from a URL. Compatible with exports from Google Calendar, Apple Calendar, Outlook, and all standard iCalendar formats.",
			},
			{
				property: "og:title",
				content: "Import a .ics calendar - Calendraft",
			},
			{
				property: "og:description",
				content: "Import an ICS calendar file from your device or a URL.",
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
					`Calendar imported successfully! ${data.importedEvents} event(s) imported.`,
				);
				navigate({ to: `/calendars/${data.calendar.id}` });
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during import";
				toast.error(message);
			},
		}),
	);

	const importFromUrlMutation = useMutation(
		trpc.calendar.importFromUrl.mutationOptions({
			onSuccess: (data) => {
				toast.success(
					`Calendar imported successfully! ${data.importedEvents} event(s) imported.`,
				);
				navigate({ to: `/calendars/${data.calendar.id}` });
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
			toast.error("Please select a file");
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
			toast.error("Please enter a URL");
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
				<Card className="transition-all duration-200 hover:shadow-lg">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Upload className="h-5 w-5" />
							Import a .ics calendar
						</CardTitle>
						<CardDescription>
							Import a calendar file from your device or from a URL. Compatible
							with Google Calendar, Apple Calendar, Outlook, and all iCalendar
							formats.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs defaultValue="file" className="w-full">
							<TabsList className="mb-6 grid w-full grid-cols-2">
								<TabsTrigger value="file" disabled={isPending}>
									<Upload className="mr-2 h-4 w-4" />
									From a file
								</TabsTrigger>
								<TabsTrigger value="url" disabled={isPending}>
									<Globe className="mr-2 h-4 w-4" />
									From a URL
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
										<Label htmlFor="name">Calendar name</Label>
										<Input
											id="name"
											value={calendarName}
											onChange={(e) => setCalendarName(e.target.value)}
											placeholder="My imported calendar"
											disabled={isPending}
										/>
										<p className="text-muted-foreground text-xs">
											Leave empty to use the file name
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
										onClick={() => navigate({ to: "/calendars" })}
										disabled={isPending}
									>
										Cancel
									</Button>
								</div>
							</TabsContent>

							{/* URL import tab */}
							<TabsContent value="url" className="space-y-6">
								<div className="space-y-2">
									<Label htmlFor="url">Calendar URL</Label>
									<Input
										id="url"
										type="url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://calendar.google.com/calendar/ical/..."
										disabled={isPending}
									/>
									<p className="text-muted-foreground text-xs">
										Paste the public URL of your calendar (ICS/iCal format)
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="url-name">Calendar name (optional)</Label>
									<Input
										id="url-name"
										value={urlCalendarName}
										onChange={(e) => setUrlCalendarName(e.target.value)}
										placeholder="My calendar"
										disabled={isPending}
									/>
								</div>

								{/* Help text */}
								<div className="rounded-lg bg-muted/50 p-4 text-sm">
									<p className="mb-2 font-medium">
										Where to find your calendar URL?
									</p>
									<ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
										<li>
											<strong>Google Calendar</strong> : Calendar settings →
											Integrate calendar → Secret address in iCal format
										</li>
										<li>
											<strong>Apple iCloud</strong> : Calendar sharing → Public
											calendar → Copy link
										</li>
										<li>
											<strong>Outlook</strong> : Calendar settings → Shared
											calendars → Publish calendar
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
												Importing...
											</>
										) : (
											<>
												<Globe className="mr-2 h-4 w-4" />
												Import from URL
											</>
										)}
									</Button>
									<Button
										variant="outline"
										onClick={() => navigate({ to: "/calendars" })}
										disabled={isPending}
									>
										Cancel
									</Button>
								</div>

								<p className="text-center text-muted-foreground text-xs">
									💡 You will be able to refresh this calendar from the URL
									later
								</p>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
