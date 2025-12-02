import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Check,
	Copy,
	ExternalLink,
	Link2,
	Loader2,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/utils/trpc";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

interface ShareCalendarDialogProps {
	calendarId: string;
	calendarName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ShareCalendarDialog({
	calendarId,
	calendarName,
	open,
	onOpenChange,
}: ShareCalendarDialogProps) {
	const queryClient = useQueryClient();
	const [newLinkName, setNewLinkName] = useState("");
	const [copiedId, setCopiedId] = useState<string | null>(null);

	// Query existing share links
	const { data: shareLinks, isLoading } = useQuery({
		...trpc.share.list.queryOptions({ calendarId }),
		enabled: open,
	});

	// Create share link mutation
	const createMutation = useMutation(
		trpc.share.create.mutationOptions({
			onSuccess: () => {
				// Invalidate using the same key structure tRPC uses
				queryClient.invalidateQueries({
					queryKey: [["share", "list"]],
				});
				setNewLinkName("");
				toast.success("Lien de partage créé");
			},
			onError: (error) => {
				toast.error(error.message || "Erreur lors de la création du lien");
			},
		}),
	);

	// Update share link mutation
	const updateMutation = useMutation(
		trpc.share.update.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["share", "list"]],
				});
			},
			onError: (error) => {
				toast.error(error.message || "Erreur lors de la mise à jour");
			},
		}),
	);

	// Delete share link mutation
	const deleteMutation = useMutation(
		trpc.share.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["share", "list"]],
				});
				toast.success("Lien de partage supprimé");
			},
			onError: (error) => {
				toast.error(error.message || "Erreur lors de la suppression");
			},
		}),
	);

	// Build share URL
	const getShareUrl = useCallback((token: string) => {
		const baseUrl = window.location.origin;
		return `${baseUrl}/share/${token}`;
	}, []);

	// Copy to clipboard
	const handleCopy = useCallback(
		async (token: string, linkId: string) => {
			const url = getShareUrl(token);
			try {
				await navigator.clipboard.writeText(url);
				setCopiedId(linkId);
				setTimeout(() => setCopiedId(null), 2000);
				toast.success("Lien copié !");
			} catch {
				toast.error("Impossible de copier le lien");
			}
		},
		[getShareUrl],
	);

	// Create new link
	const handleCreate = useCallback(() => {
		createMutation.mutate({
			calendarId,
			name: newLinkName.trim() || undefined,
		});
	}, [calendarId, createMutation, newLinkName]);

	// Toggle link active state
	const handleToggleActive = useCallback(
		(linkId: string, isActive: boolean) => {
			updateMutation.mutate({ id: linkId, isActive });
		},
		[updateMutation],
	);

	// Delete link
	const handleDelete = useCallback(
		(linkId: string) => {
			if (confirm("Êtes-vous sûr de vouloir supprimer ce lien de partage ?")) {
				deleteMutation.mutate({ id: linkId });
			}
		},
		[deleteMutation],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Link2 className="h-5 w-5" />
						Partager « {calendarName} »
					</DialogTitle>
					<DialogDescription>
						Créez des liens de partage pour permettre à d'autres personnes de
						télécharger ce calendrier au format .ics
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Create new link */}
					<div className="flex gap-2">
						<Input
							placeholder="Nom du lien (optionnel)"
							value={newLinkName}
							onChange={(e) => setNewLinkName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleCreate()}
							className="flex-1"
						/>
						<Button
							onClick={handleCreate}
							disabled={createMutation.isPending}
							size="sm"
						>
							{createMutation.isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Plus className="h-4 w-4" />
							)}
							<span className="ml-2 hidden sm:inline">Créer</span>
						</Button>
					</div>

					<hr className="border-border" />

					{/* List of share links */}
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : shareLinks && shareLinks.length > 0 ? (
						<div className="space-y-3">
							{shareLinks.map((link) => (
								<div
									key={link.id}
									className="rounded-lg border bg-card p-3 transition-colors hover:bg-accent/5"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="truncate font-medium text-sm">
													{link.name || "Lien sans nom"}
												</span>
												{!link.isActive && (
													<Badge variant="secondary" className="text-xs">
														Désactivé
													</Badge>
												)}
											</div>
											<div className="mt-1 flex items-center gap-2">
												<code className="max-w-[200px] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
													{getShareUrl(link.token)}
												</code>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6"
													onClick={() => handleCopy(link.token, link.id)}
												>
													{copiedId === link.id ? (
														<Check className="h-3 w-3 text-green-500" />
													) : (
														<Copy className="h-3 w-3" />
													)}
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6"
													asChild
												>
													<a
														href={getShareUrl(link.token)}
														target="_blank"
														rel="noopener noreferrer"
													>
														<ExternalLink className="h-3 w-3" />
													</a>
												</Button>
											</div>
											<div className="mt-1.5 text-muted-foreground text-xs">
												{link.accessCount > 0
													? `${link.accessCount} accès`
													: "Jamais utilisé"}
												{link.lastAccessedAt && (
													<>
														{" "}
														• Dernier accès{" "}
														{format(
															new Date(link.lastAccessedAt),
															"d MMM à HH:mm",
															{ locale: fr },
														)}
													</>
												)}
												<span className="ml-2 text-muted-foreground/70">
													Créé le{" "}
													{format(new Date(link.createdAt), "d MMM yyyy", {
														locale: fr,
													})}
												</span>
											</div>
										</div>

										<div className="flex items-center gap-2">
											<div className="flex items-center gap-1.5">
												<Label
													htmlFor={`active-${link.id}`}
													className="sr-only"
												>
													Activer/Désactiver
												</Label>
												<Switch
													id={`active-${link.id}`}
													checked={link.isActive}
													onCheckedChange={(checked) =>
														handleToggleActive(link.id, checked)
													}
												/>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
												onClick={() => handleDelete(link.id)}
												disabled={deleteMutation.isPending}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="py-8 text-center text-muted-foreground text-sm">
							<Link2 className="mx-auto mb-2 h-8 w-8 opacity-50" />
							<p>Aucun lien de partage</p>
							<p className="text-xs">
								Créez un lien pour partager ce calendrier
							</p>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
