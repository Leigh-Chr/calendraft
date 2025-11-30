import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	stripSearchParams,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Loader2, Merge } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCalendars } from "@/hooks/use-storage";
import { QUERY_KEYS } from "@/lib/query-keys";
import {
	mergeCalendarsDefaults,
	mergeCalendarsSearchSchema,
	parseSelectedIds,
} from "@/lib/search-params";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/merge")({
	component: MergeCalendarsComponent,
	validateSearch: zodValidator(mergeCalendarsSearchSchema),
	search: {
		middlewares: [stripSearchParams(mergeCalendarsDefaults)],
	},
});

function MergeCalendarsComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { calendars } = useCalendars();
	const search = Route.useSearch();

	// Initialize from URL params
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		() => new Set(parseSelectedIds(search.selected)),
	);
	const [mergedName, setMergedName] = useState("");
	const [removeDuplicates, setRemoveDuplicates] = useState(false);

	// Sync URL changes to local state (browser back/forward)
	useEffect(() => {
		setSelectedIds(new Set(parseSelectedIds(search.selected)));
	}, [search.selected]);

	const mergeMutation = useMutation(
		trpc.calendar.merge.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calendar.list });
				toast.success(
					`Calendriers fusionnés ! ${data.mergedEvents} événement(s), ${data.removedDuplicates} doublon(s) supprimé(s).`,
				);
				navigate({ to: `/calendars/${data.calendar.id}` });
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Erreur lors de la fusion";
				toast.error(message);
			},
		}),
	);

	const handleToggle = (id: string) => {
		const newSet = new Set(selectedIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedIds(newSet);

		// Update URL with selected IDs (as comma-separated string)
		const selectedStr = Array.from(newSet).join(",");
		navigate({
			to: ".",
			search: { selected: selectedStr || undefined },
			replace: true, // Don't add to history for each toggle
		});
	};

	const handleMerge = () => {
		if (selectedIds.size < 2) {
			toast.error("Sélectionnez au moins 2 calendriers à fusionner");
			return;
		}

		if (!mergedName.trim()) {
			toast.error("Veuillez entrer un nom pour le calendrier fusionné");
			return;
		}

		mergeMutation.mutate({
			calendarIds: Array.from(selectedIds),
			name: mergedName.trim(),
			removeDuplicates,
		});
	};

	return (
		<div className="container mx-auto max-w-2xl px-4 py-10">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Merge className="h-5 w-5" />
						Fusionner des calendriers
					</CardTitle>
					<CardDescription>
						Combinez plusieurs calendriers en un seul
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Sélectionnez les calendriers à fusionner (minimum 2)</Label>
						<div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-4">
							{calendars.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									Aucun calendrier disponible
								</p>
							) : (
								calendars.map((calendar) => (
									<div
										key={calendar.id}
										className="flex items-center space-x-2 rounded-md border p-2 hover:bg-accent"
									>
										<Checkbox
											id={calendar.id}
											checked={selectedIds.has(calendar.id)}
											onCheckedChange={() => handleToggle(calendar.id)}
										/>
										<label
											htmlFor={calendar.id}
											className="flex-1 cursor-pointer text-sm"
										>
											{calendar.name} ({calendar.eventCount} événement
											{calendar.eventCount !== 1 ? "s" : ""})
										</label>
									</div>
								))
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="mergedName">Nom du calendrier fusionné</Label>
						<Input
							id="mergedName"
							value={mergedName}
							onChange={(e) => setMergedName(e.target.value)}
							placeholder="Calendrier fusionné"
							disabled={mergeMutation.isPending}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="removeDuplicates"
							checked={removeDuplicates}
							onCheckedChange={(checked) =>
								setRemoveDuplicates(checked === true)
							}
							disabled={mergeMutation.isPending}
						/>
						<label
							htmlFor="removeDuplicates"
							className="cursor-pointer text-sm"
						>
							Supprimer les doublons (même titre + mêmes horaires)
						</label>
					</div>

					<div className="flex gap-2">
						<Button
							onClick={handleMerge}
							disabled={
								selectedIds.size < 2 ||
								!mergedName.trim() ||
								mergeMutation.isPending
							}
							className="flex-1"
						>
							{mergeMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Fusion en cours...
								</>
							) : (
								"Fusionner"
							)}
						</Button>
						<Button
							variant="outline"
							onClick={() => navigate({ to: "/calendars" })}
							disabled={mergeMutation.isPending}
						>
							Annuler
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
