import {
	createFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { Calendar, Edit, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AccountPrompt } from "@/components/account-prompt";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	useCalendars,
	useDeleteCalendar,
	useUpdateCalendar,
} from "@/hooks/use-storage";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/calendars")({
	component: CalendarsListComponent,
	head: () => ({
		meta: [
			{ title: "Mes calendriers - Calendraft" },
			{
				name: "description",
				content:
					"Gérez tous vos calendriers ICS en un seul endroit. Créez, modifiez, fusionnez et exportez vos calendriers facilement.",
			},
			{ property: "og:title", content: "Mes calendriers - Calendraft" },
			{
				property: "og:description",
				content: "Gérez tous vos calendriers ICS en un seul endroit.",
			},
			{ property: "og:url", content: `${BASE_URL}/calendars` },
			{ name: "robots", content: "noindex, nofollow" }, // Private page
		],
		links: [{ rel: "canonical", href: `${BASE_URL}/calendars` }],
	}),
});

// Combined dialog state type - more maintainable than separate booleans
type DialogState =
	| { type: "delete"; calendar: { id: string; name: string } }
	| { type: "rename"; calendar: { id: string; name: string }; newName: string }
	| null;

function CalendarsListComponent() {
	const navigate = useNavigate();
	const location = useLocation();
	const { calendars, isLoading } = useCalendars();
	const { deleteCalendar, isDeleting } = useDeleteCalendar();
	const { updateCalendar, isUpdating } = useUpdateCalendar();

	// Single state for all dialogs
	const [dialog, setDialog] = useState<DialogState>(null);

	const openDeleteDialog = useCallback((id: string, name: string) => {
		setDialog({ type: "delete", calendar: { id, name } });
	}, []);

	const openRenameDialog = useCallback((id: string, name: string) => {
		setDialog({ type: "rename", calendar: { id, name }, newName: name });
	}, []);

	const closeDialog = useCallback(() => {
		setDialog(null);
	}, []);

	const handleRenameInputChange = useCallback((value: string) => {
		setDialog((prev) => {
			if (prev?.type === "rename") {
				return { ...prev, newName: value };
			}
			return prev;
		});
	}, []);

	const confirmDelete = useCallback(() => {
		if (dialog?.type === "delete") {
			deleteCalendar({ id: dialog.calendar.id });
			closeDialog();
		}
	}, [dialog, deleteCalendar, closeDialog]);

	const confirmRename = useCallback(() => {
		if (dialog?.type === "rename") {
			const trimmedName = dialog.newName.trim();
			if (trimmedName) {
				updateCalendar({ id: dialog.calendar.id, name: trimmedName });
				closeDialog();
			} else {
				toast.error("Le nom ne peut pas être vide");
			}
		}
	}, [dialog, updateCalendar, closeDialog]);

	// If we're on a child route (like /calendars/new), render the child route
	// TanStack Router will handle this automatically via Outlet
	if (
		location.pathname !== "/calendars" &&
		location.pathname.startsWith("/calendars/")
	) {
		return <Outlet />;
	}

	if (isLoading) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-10">
				<div className="text-center">Chargement...</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto max-w-4xl px-4 py-10">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-3xl">Mes calendriers</h1>
				<Button onClick={() => navigate({ to: "/calendars/new" })}>
					<Plus className="mr-2 h-4 w-4" />
					Nouveau calendrier
				</Button>
			</div>

			<AccountPrompt variant="banner" />

			{calendars.length === 0 ? (
				<Card>
					<CardContent className="py-10 text-center">
						<Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p className="mb-4 text-muted-foreground">
							Vous n'avez pas encore de calendriers
						</p>
						<Button onClick={() => navigate({ to: "/" })}>
							Créer votre premier calendrier
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{calendars.map((calendar) => (
						<Card key={calendar.id}>
							<CardHeader>
								<CardTitle className="line-clamp-1">{calendar.name}</CardTitle>
								<CardDescription>
									{calendar.eventCount} événement
									{calendar.eventCount !== 1 ? "s" : ""}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex gap-2">
								<Button
									variant="default"
									size="sm"
									className="flex-1"
									onClick={() => navigate({ to: `/calendars/${calendar.id}` })}
								>
									<ExternalLink className="mr-2 h-4 w-4" />
									Ouvrir
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => openRenameDialog(calendar.id, calendar.name)}
									disabled={isUpdating}
								>
									<Edit className="h-4 w-4" />
								</Button>
								<Button
									variant="outline"
									size="icon"
									onClick={() => openDeleteDialog(calendar.id, calendar.name)}
									disabled={isDeleting}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Delete Dialog */}
			<AlertDialog
				open={dialog?.type === "delete"}
				onOpenChange={(open) => !open && closeDialog()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer le calendrier</AlertDialogTitle>
						<AlertDialogDescription>
							Êtes-vous sûr de vouloir supprimer "
							{dialog?.type === "delete" ? dialog.calendar.name : ""}" ? Cette
							action est irréversible.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Rename Dialog */}
			<AlertDialog
				open={dialog?.type === "rename"}
				onOpenChange={(open) => !open && closeDialog()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Renommer le calendrier</AlertDialogTitle>
						<AlertDialogDescription>
							Entrez le nouveau nom pour "
							{dialog?.type === "rename" ? dialog.calendar.name : ""}"
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="py-4">
						<Input
							value={dialog?.type === "rename" ? dialog.newName : ""}
							onChange={(e) => handleRenameInputChange(e.target.value)}
							placeholder="Nom du calendrier"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									confirmRename();
								}
							}}
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={confirmRename} disabled={isUpdating}>
							Renommer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
