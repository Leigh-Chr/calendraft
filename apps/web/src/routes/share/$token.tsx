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
			{ title: "Calendrier partagé - Calendraft" },
			{
				name: "description",
				content:
					"Téléchargez ce calendrier partagé au format .ics compatible avec toutes les applications calendrier.",
			},
		],
	}),
});

function SharePage() {
	const { token } = Route.useParams();
	const [downloadState, setDownloadState] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");

	// Get calendar info
	const {
		data: info,
		isLoading,
		error,
	} = useQuery({
		...trpc.share.getInfoByToken.queryOptions({ token }),
		queryKey: QUERY_KEYS.share.infoByToken(token),
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
			toast.success("Calendrier téléchargé !");
		} catch (_err) {
			setDownloadState("error");
			toast.error("Erreur lors du téléchargement");
		}
	}, [token]);

	// Error state
	if (error) {
		const errorMessage =
			error.message || "Ce lien de partage n'est pas valide ou a expiré.";
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
							<CardTitle>Lien non valide</CardTitle>
							<CardDescription>{errorMessage}</CardDescription>
						</CardHeader>
						<CardContent className="text-center">
							<Button asChild variant="outline">
								<Link to="/">Retour à l'accueil</Link>
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
					<p className="mt-4 text-muted-foreground">Chargement...</p>
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
							{info?.eventCount} événement{info?.eventCount !== 1 ? "s" : ""}
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-4">
						<p className="text-center text-muted-foreground text-sm">
							Ce calendrier vous a été partagé. Téléchargez-le au format .ics
							pour l'importer dans votre application calendrier préférée.
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
									Téléchargement...
								</>
							) : downloadState === "success" ? (
								<>
									<CheckCircle2 className="mr-2 h-5 w-5" />
									Téléchargé !
								</>
							) : (
								<>
									<Download className="mr-2 h-5 w-5" />
									Télécharger le calendrier
								</>
							)}
						</Button>

						{downloadState === "success" && (
							<p className="text-center text-muted-foreground text-sm">
								Le fichier a été téléchargé. Ouvrez-le avec votre application
								calendrier pour l'importer.
							</p>
						)}

						<div className="border-t pt-4">
							<p className="mb-3 text-center text-muted-foreground text-xs">
								Compatible avec :
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
						Besoin de créer vos propres calendriers ?
					</p>
					<Button asChild variant="link" className="text-primary">
						<Link to="/">
							Découvrir Calendraft
							<ExternalLink className="ml-1 h-4 w-4" />
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
