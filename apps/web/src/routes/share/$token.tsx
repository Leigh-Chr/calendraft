import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Calendar,
	CheckCircle2,
	Download,
	ExternalLink,
	Layers,
	Loader2,
	XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EventBadges } from "@/components/event-list/event-badges";
import { EventDetails } from "@/components/event-list/event-details";
import type { EventItem } from "@/components/event-list/types";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { groupEventsByDate } from "@/lib/date-utils";
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

	// Detect share type using dedicated endpoint (no errors thrown)
	const { data: typeDetection, isLoading: isDetectingType } = useQuery({
		...trpc.share.detectType.queryOptions({ token: token || "" }),
		enabled: !!token && token.length > 0,
		retry: false,
	});

	const shareType = typeDetection?.type ?? null;
	const detectionError = typeDetection?.reason;

	// Get single calendar info (only if type is single)
	const {
		data: singleInfo,
		isLoading: isLoadingSingle,
		error: singleError,
	} = useQuery({
		...trpc.share.getInfoByToken.queryOptions({ token: token || "" }),
		enabled: !!token && token.length > 0 && shareType === "single",
		retry: false,
	});

	// Get bundle info (only if type is bundle)
	const {
		data: bundleInfo,
		isLoading: isLoadingBundle,
		error: bundleError,
	} = useQuery({
		...trpc.share.bundle.getInfoByToken.queryOptions({ token: token || "" }),
		enabled: !!token && token.length > 0 && shareType === "bundle",
		retry: false,
	});

	// Get calendar events (only for single)
	const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
		...trpc.share.getEventsByToken.queryOptions({ token: token || "" }),
		enabled: !!token && token.length > 0 && !!singleInfo,
		retry: false,
	});

	// Helper to get error message from detection reason
	const getErrorMessageForReason = useCallback((reason: string): string => {
		switch (reason) {
			case "not_found":
				return "This sharing link is not valid or has expired.";
			case "disabled":
				return "This sharing link has been disabled.";
			case "expired":
				return "This sharing link has expired.";
			default:
				return "This sharing link is not valid.";
		}
	}, []);

	const isLoading = isDetectingType || isLoadingSingle || isLoadingBundle;
	const error =
		shareType === "single"
			? singleError
			: shareType === "bundle"
				? bundleError
				: detectionError
					? { message: getErrorMessageForReason(detectionError) }
					: null;
	const info = shareType === "single" ? singleInfo : bundleInfo;

	// Group events by date (only for single calendar) - MUST be before any returns
	const groupedEvents = useMemo(() => {
		if (!eventsData?.events || shareType !== "single") return new Map();
		return groupEventsByDate(eventsData.events as EventItem[]);
	}, [eventsData?.events, shareType]);

	// Download handler
	const handleDownload = useCallback(async () => {
		setDownloadState("loading");
		try {
			let data: Blob | undefined;
			let filename: string | undefined;

			if (shareType === "bundle") {
				data = await trpcClient.share.bundle.getByToken.query({ token });
				filename = `${data.bundleName}.ics`;
			} else {
				data = await trpcClient.share.getByToken.query({ token });
				filename = `${data.calendarName}.ics`;
			}

			// Create blob and download
			const blob = new Blob([data.icsContent], { type: "text/calendar" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			setDownloadState("success");
			toast.success(
				shareType === "bundle"
					? "Calendars bundle downloaded!"
					: "Calendar downloaded!",
			);
		} catch (_err) {
			setDownloadState("error");
			toast.error("Error during download");
		}
	}, [token, shareType]);

	// Error state
	if (error && !isLoading) {
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

	// Render bundle view
	if (shareType === "bundle" && bundleInfo) {
		return (
			<div className="relative min-h-screen">
				{/* Background */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-20" />
				</div>

				<div className="container mx-auto max-w-4xl px-4 py-10">
					{/* Header Card */}
					<Card className="mb-6">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
								<Layers className="h-8 w-8 text-primary" />
							</div>
							<CardTitle className="text-heading-1">
								{bundleInfo.bundleName}
							</CardTitle>
							<CardDescription>
								{bundleInfo.calendarCount} calendar
								{bundleInfo.calendarCount !== 1 ? "s" : ""} •{" "}
								{bundleInfo.totalEvents} event
								{bundleInfo.totalEvents !== 1 ? "s" : ""}
								{bundleInfo.removedCalendars > 0 && (
									<span className="mt-1 block text-warning text-xs">
										{bundleInfo.removedCalendars} calendar
										{bundleInfo.removedCalendars !== 1 ? "s" : ""} were removed
										from this bundle
									</span>
								)}
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4">
							<p className="text-center text-muted-foreground text-sm">
								This bundle contains multiple calendars. Download them all
								together in a single .ics file.
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
										Download all calendars
									</>
								)}
							</Button>

							{downloadState === "success" && (
								<p className="text-center text-muted-foreground text-sm">
									The file has been downloaded. Open it with your calendar
									application to import it.
								</p>
							)}

							{/* Calendars list */}
							{bundleInfo.calendars.length > 0 && (
								<div className="border-t pt-4">
									<p className="mb-3 text-center font-medium text-small">
										Calendars in this bundle:
									</p>
									<div className="space-y-2">
										{bundleInfo.calendars.map((cal) => (
											<div
												key={cal.id}
												className="flex items-center justify-between rounded-lg border bg-card p-3"
											>
												<div className="flex items-center gap-2">
													<div
														className="h-3 w-3 rounded-full"
														style={{ backgroundColor: cal.color || "#D4A017" }}
													/>
													<span className="font-medium text-small">
														{cal.name}
													</span>
													<span className="text-muted-foreground text-xs">
														({cal.eventCount} events)
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
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
									<span className="rounded-full bg-muted px-3 py-1">
										Outlook
									</span>
									<span className="rounded-full bg-muted px-3 py-1">
										Thunderbird
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="mt-8 text-center">
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

	// Render single calendar view (existing code)
	if (shareType === "single" && info) {
		return (
			<div className="relative min-h-screen">
				{/* Background */}
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-20" />
				</div>

				<div className="container mx-auto max-w-4xl px-4 py-10">
					{/* Header Card */}
					<Card className="mb-6">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
								<Calendar className="h-8 w-8 text-primary" />
							</div>
							<CardTitle className="text-heading-1">
								{info?.calendarName}
							</CardTitle>
							<CardDescription>
								{info?.shareName && (
									<span className="mb-1 block text-sm">{info.shareName}</span>
								)}
								{info?.eventCount} event{info?.eventCount !== 1 ? "s" : ""}
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4">
							<p className="text-center text-muted-foreground text-sm">
								This calendar has been shared with you. Download it in .ics
								format to import it into your favorite calendar application.
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
									<span className="rounded-full bg-muted px-3 py-1">
										Outlook
									</span>
									<span className="rounded-full bg-muted px-3 py-1">
										Thunderbird
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Events Section */}
					{eventsData && eventsData.events.length > 0 && (
						<div className="space-y-6">
							<h2 className="text-heading-2">Events</h2>
							{Array.from(groupedEvents.entries()).map(
								([dateKey, { label, date, events: dayEvents }]) => (
									<div key={dateKey} className="space-y-3">
										{/* Date Header */}
										<div className="flex items-center gap-3">
											<div className="h-px flex-1 bg-border" />
											<div className="flex items-center gap-2">
												<span className="font-medium text-foreground text-small">
													{label}
												</span>
												<span className="text-muted-foreground text-sm">
													{format(date, "EEEE, MMMM d", { locale: enUS })}
												</span>
												<span className="text-muted-foreground text-xs">
													({dayEvents.length} event
													{dayEvents.length > 1 ? "s" : ""})
												</span>
											</div>
											<div className="h-px flex-1 bg-border" />
										</div>

										{/* Events for this date */}
										<div className="space-y-3">
											{dayEvents.map((event) => (
												<SharedEventCard
													key={event.id}
													event={event as EventItem}
													calendarColor={eventsData.calendarColor}
												/>
											))}
										</div>
									</div>
								),
							)}
						</div>
					)}

					{eventsData && eventsData.events.length === 0 && (
						<Card>
							<CardContent className="py-10 text-center">
								<p className="text-muted-foreground">
									No events in this calendar
								</p>
							</CardContent>
						</Card>
					)}

					<div className="mt-8 text-center">
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

	// Still loading or no type determined yet
	return null;
}

/**
 * Simplified event card for shared calendar (read-only)
 */
function SharedEventCard({
	event,
	calendarColor,
}: {
	event: EventItem;
	calendarColor: string | null | undefined;
}) {
	return (
		<Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md">
			{/* Color accent bar - left border like EventCard */}
			<div
				className="absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-1.5"
				style={{ backgroundColor: event.color || calendarColor || "#D4A017" }}
			/>

			<CardContent className="py-4 pr-4 pl-5">
				<div className="min-w-0 flex-1">
					<EventBadges event={event} showColor={false} />
					<EventDetails event={event} />
				</div>
			</CardContent>
		</Card>
	);
}
