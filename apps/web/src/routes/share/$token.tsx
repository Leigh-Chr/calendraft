import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Calendar,
	CheckCircle2,
	Download,
	ExternalLink,
	Loader2,
	XCircle,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/share/$token")({
	component: SharePage,
	head: () => ({
		meta: [
			{ title: "Shared calendar - Calendraft" },
			{
				name: "description",
				content:
					"Download this shared calendar in .ics format compatible with all calendar applications.",
			},
		],
	}),
});

function SharePage() {
	const { token } = Route.useParams();
	const [downloadState, setDownloadState] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");

	// Get calendar info - only query if token exists
	const {
		data: info,
		isLoading,
		error,
	} = useQuery({
		...trpc.share.getInfoByToken.queryOptions({ token: token || "" }),
		enabled: !!token && token.length > 0,
		retry: false,
	});

	// Download handler
	const handleDownload = useCallback(async () => {
		setDownloadState("loading");
		try {
			const data = await trpcClient.share.getByToken.query({ token });

			// Create blob and download
			const blob = new Blob([data.icsContent], { type: "text/calendar" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${data.calendarName}.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setDownloadState("success");
			toast.success("Calendar downloaded!");
		} catch (_err) {
			setDownloadState("error");
			toast.error("Error during download");
		}
	}, [token]);

	// Error state
	if (error) {
		const errorMessage =
			error.message || "This sharing link is not valid or has expired.";
		return (
			<div className="relative min-h-screen">
				{/* Background */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-20" />
				</div>

				<div className="container mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
					<Card className="w-full">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
								<XCircle className="h-8 w-8 text-destructive" />
							</div>
							<CardTitle>Invalid link</CardTitle>
							<CardDescription>{errorMessage}</CardDescription>
						</CardHeader>
						<CardContent className="text-center">
							<Button asChild variant="outline">
								<Link to="/">Back to home</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	// Loading state
	if (isLoading) {
		return (
			<div className="relative min-h-screen">
				{/* Background */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-20" />
				</div>

				<div className="container mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
					<Loader2 className="h-10 w-10 animate-spin text-primary" />
					<p className="mt-4 text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen">
			{/* Background */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-20" />
			</div>

			<div className="container mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 py-10">
				<Card className="w-full">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<Calendar className="h-8 w-8 text-primary" />
						</div>
						<CardTitle className="text-2xl">{info?.calendarName}</CardTitle>
						<CardDescription>
							{info?.shareName && (
								<span className="mb-1 block text-sm">{info.shareName}</span>
							)}
							{info?.eventCount} event{info?.eventCount !== 1 ? "s" : ""}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						<p className="text-center text-muted-foreground text-sm">
							This calendar has been shared with you. Download it in .ics format
							to import it into your favorite calendar application.
						</p>

						<Button
							onClick={handleDownload}
							className="w-full"
							size="lg"
							disabled={downloadState === "loading"}
						>
							{downloadState === "loading" ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									Downloading...
								</>
							) : downloadState === "success" ? (
								<>
									<CheckCircle2 className="mr-2 h-5 w-5" />
									Downloaded!
								</>
							) : (
								<>
									<Download className="mr-2 h-5 w-5" />
									Download calendar
								</>
							)}
						</Button>

						{downloadState === "success" && (
							<p className="text-center text-muted-foreground text-sm">
								The file has been downloaded. Open it with your calendar
								application to import it.
							</p>
						)}

						<div className="border-t pt-4">
							<p className="mb-3 text-center text-muted-foreground text-xs">
								Compatible with:
							</p>
							<div className="flex flex-wrap justify-center gap-2 text-muted-foreground text-xs">
								<span className="rounded-full bg-muted px-3 py-1">
									Google Calendar
								</span>
								<span className="rounded-full bg-muted px-3 py-1">
									Apple Calendar
								</span>
								<span className="rounded-full bg-muted px-3 py-1">Outlook</span>
								<span className="rounded-full bg-muted px-3 py-1">
									Thunderbird
								</span>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="mt-6 text-center">
					<p className="text-muted-foreground text-sm">
						Need to create your own calendars?
					</p>
					<Button asChild variant="link" className="text-primary">
						<Link to="/">
							Discover Calendraft
							<ExternalLink className="ml-1 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
