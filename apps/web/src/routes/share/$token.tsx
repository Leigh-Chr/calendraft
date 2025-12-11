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
import { useState } from "react";
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

/**
 * Get error message from detection reason
 */
function getErrorMessageForReason(reason: string): string {
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
}

/**
 * Download share as ICS file
 */
async function downloadShareAsICS(
	token: string,
	shareType: "single" | "bundle" | null,
): Promise<{ filename: string }> {
	let filename: string;

	let data: { icsContent: string; bundleName?: string; calendarName?: string };
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

	return { filename };
}

/**
 * Share error view component
 */
function ShareErrorView({ errorMessage }: { errorMessage: string }) {
	return (
		<div className="relative min-h-screen">
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

/**
 * Compute error from share queries
 */
function computeShareError(
	shareType: "single" | "bundle" | null,
	singleError: unknown,
	bundleError: unknown,
	detectionError: string | undefined,
): { message: string } | null {
	if (shareType === "single") {
		return singleError as { message: string } | null;
	}
	if (shareType === "bundle") {
		return bundleError as { message: string } | null;
	}
	if (detectionError) {
		return { message: getErrorMessageForReason(detectionError) };
	}
	return null;
}

/**
 * Hook to manage share data queries
 */
function useShareData(token: string | undefined) {
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
	const { data: eventsData } = useQuery({
		...trpc.share.getEventsByToken.queryOptions({ token: token || "" }),
		enabled: !!token && token.length > 0 && !!singleInfo,
		retry: false,
	});

	const isLoading = isDetectingType || isLoadingSingle || isLoadingBundle;
	const error = computeShareError(
		shareType,
		singleError,
		bundleError,
		detectionError,
	);
	const info = shareType === "single" ? singleInfo : bundleInfo;

	// Group events by date (only for single calendar)
	const groupedEvents = (() => {
		if (!eventsData?.events || shareType !== "single") return new Map();
		return groupEventsByDate(eventsData.events as EventItem[]);
	})();

	return {
		shareType,
		isLoading,
		error,
		info,
		singleInfo,
		bundleInfo,
		eventsData,
		groupedEvents,
	};
}

/**
 * Loading view component
 */
function ShareLoadingView() {
	return (
		<div className="relative min-h-screen">
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

/**
 * Bundle share view component
 */
function BundleShareView({
	bundleInfo,
	downloadState,
	onDownload,
}: {
	bundleInfo: {
		bundleName: string;
		calendarCount: number;
		totalEvents: number;
		removedCalendars: number;
		calendars: Array<{
			id: string;
			name: string;
			color?: string | null;
			eventCount: number;
		}>;
	};
	downloadState: "idle" | "loading" | "success" | "error";
	onDownload: () => void;
}) {
	return (
		<div className="relative min-h-screen">
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-20" />
			</div>

			<div className="container mx-auto max-w-4xl px-4 py-10">
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
							onClick={onDownload}
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
								<span className="rounded-full bg-muted px-3 py-1">Outlook</span>
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

/**
 * Single calendar share view component
 */
function SingleShareView({
	info,
	eventsData,
	groupedEvents,
	downloadState,
	onDownload,
}: {
	info: {
		calendarName: string;
		shareName?: string | null;
		eventCount: number;
	};
	eventsData: {
		events: EventItem[];
		calendarColor: string | null | undefined;
	} | null;
	groupedEvents: Map<
		string,
		{ label: string; date: Date; events: EventItem[] }
	>;
	downloadState: "idle" | "loading" | "success" | "error";
	onDownload: () => void;
}) {
	return (
		<div className="relative min-h-screen">
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-20" />
			</div>

			<div className="container mx-auto max-w-4xl px-4 py-10">
				<Card className="mb-6">
					<CardHeader className="text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<Calendar className="h-8 w-8 text-primary" />
						</div>
						<CardTitle className="text-heading-1">
							{info.calendarName}
						</CardTitle>
						<CardDescription>
							{info.shareName && (
								<span className="mb-1 block text-sm">{info.shareName}</span>
							)}
							{info.eventCount} event{info.eventCount !== 1 ? "s" : ""}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						<p className="text-center text-muted-foreground text-sm">
							This calendar has been shared with you. Download it in .ics format
							to import it into your favorite calendar application.
						</p>

						<Button
							onClick={onDownload}
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

				{eventsData && eventsData.events.length > 0 && (
					<div className="space-y-6">
						<h2 className="text-heading-2">Events</h2>
						{Array.from(groupedEvents.entries()).map(
							([dateKey, { label, date, events: dayEvents }]) => (
								<div key={dateKey} className="space-y-3">
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

function SharePage() {
	const { token } = Route.useParams();
	const [downloadState, setDownloadState] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");

	const {
		shareType,
		isLoading,
		error,
		info,
		bundleInfo,
		eventsData,
		groupedEvents,
	} = useShareData(token);

	// Download handler
	// React Compiler will automatically memoize this callback
	const handleDownload = async () => {
		setDownloadState("loading");
		try {
			await downloadShareAsICS(token, shareType);
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
	};

	// Error state
	if (error && !isLoading) {
		const errorMessage =
			error.message || "This sharing link is not valid or has expired.";
		return <ShareErrorView errorMessage={errorMessage} />;
	}

	// Loading state
	if (isLoading) {
		return <ShareLoadingView />;
	}

	// Render bundle view
	if (shareType === "bundle" && bundleInfo) {
		return (
			<BundleShareView
				bundleInfo={bundleInfo}
				downloadState={downloadState}
				onDownload={handleDownload}
			/>
		);
	}

	// Render single calendar view
	if (shareType === "single" && info) {
		return (
			<SingleShareView
				info={info}
				eventsData={eventsData}
				groupedEvents={groupedEvents}
				downloadState={downloadState}
				onDownload={handleDownload}
			/>
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
