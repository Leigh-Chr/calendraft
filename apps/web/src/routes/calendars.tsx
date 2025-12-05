import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Calendar,
	Edit,
	ExternalLink,
	FileUp,
	Globe,
	MoreHorizontal,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AccountPrompt } from "@/components/account-prompt";
import { StaggerContainer, StaggerItem } from "@/components/page-transition";
import { TourAlertDialog } from "@/components/tour";
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
import { ColorPicker } from "@/components/ui/color-picker";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalendraftTour } from "@/hooks/use-calendraft-tour";
import {
	useCalendars,
	useDeleteCalendar,
	useUpdateCalendar,
} from "@/hooks/use-storage";
import { TOUR_STEP_IDS } from "@/lib/tour-constants";
import { cn } from "@/lib/utils";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/calendars")({
	component: CalendarsListComponent,
	head: () => ({
		meta: [
			{ title: "My calendars - Calendraft" },
			{
				name: "description",
				content:
					"Manage all your ICS calendars in one place. Create, edit, merge, and export your calendars easily.",
			},
			{ property: "og:title", content: "My calendars - Calendraft" },
			{
				property: "og:description",
				content: "Manage all your ICS calendars in one place.",
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
	| {
			type: "edit";
			calendar: { id: string; name: string; color?: string | null };
			newName: string;
			newColor: string | null;
	  }
	| null;

function CalendarsListComponent() {
	const navigate = useNavigate();
	const location = useLocation();
	const { calendars, isLoading } = useCalendars();
	const { deleteCalendar, isDeleting } = useDeleteCalendar();
	const { updateCalendar, isUpdating } = useUpdateCalendar();

	// Tour state
	const { openDialog: tourOpen, setOpenDialog: setTourOpen } =
		useCalendraftTour();

	// Single state for all dialogs
	const [dialog, setDialog] = useState<DialogState>(null);

	const openDeleteDialog = useCallback((id: string, name: string) => {
		setDialog({ type: "delete", calendar: { id, name } });
	}, []);

	const openEditDialog = useCallback(
		(id: string, name: string, color?: string | null) => {
			setDialog({
				type: "edit",
				calendar: { id, name, color },
				newName: name,
				newColor: color || null,
			});
		},
		[],
	);

	const closeDialog = useCallback(() => {
		setDialog(null);
	}, []);

	const handleEditNameChange = useCallback((value: string) => {
		setDialog((prev) => {
			if (prev?.type === "edit") {
				return { ...prev, newName: value };
			}
			return prev;
		});
	}, []);

	const handleEditColorChange = useCallback((value: string | null) => {
		setDialog((prev) => {
			if (prev?.type === "edit") {
				return { ...prev, newColor: value };
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

	const confirmEdit = useCallback(() => {
		if (dialog?.type === "edit") {
			const trimmedName = dialog.newName.trim();
			if (trimmedName) {
				updateCalendar({
					id: dialog.calendar.id,
					name: trimmedName,
					color: dialog.newColor,
				});
				closeDialog();
			} else {
				toast.error("Name cannot be empty");
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
			<div className="relative min-h-[calc(100vh-4rem)]">
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-30" />
				</div>
				<div className="container mx-auto max-w-5xl px-4 py-10">
					<div className="mb-6 flex items-center justify-between">
						<Skeleton className="h-9 w-48" />
						<div className="flex gap-2">
							<Skeleton className="h-10 w-40" />
							<Skeleton className="h-10 w-28" />
						</div>
					</div>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="shimmer">
								<CardHeader className="pb-3">
									<Skeleton className="h-5 w-32" />
									<Skeleton className="h-4 w-24" />
								</CardHeader>
								<CardContent>
									<Skeleton className="h-9 w-full" />
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background pattern */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
				<div className="cross-grid absolute inset-0 opacity-20 [mask-image:linear-gradient(to_bottom,#000_0%,transparent_50%)]" />
			</div>

			<div className="container mx-auto max-w-5xl px-4 py-10">
				{/* Tour dialog */}
				<TourAlertDialog isOpen={tourOpen} setIsOpen={setTourOpen} />

				<div className="mb-6 flex items-center justify-between">
					<h1 className="font-bold text-3xl">My calendars</h1>
					<div className="flex items-center gap-2">
						<Button
							id={TOUR_STEP_IDS.NEW_CALENDAR_BUTTON}
							onClick={() => navigate({ to: "/calendars/new" })}
						>
							<Plus className="mr-2 h-4 w-4" />
							New calendar
						</Button>
						<Button id={TOUR_STEP_IDS.IMPORT_BUTTON} variant="outline" asChild>
							<Link to="/calendars/import">
								<FileUp className="mr-2 h-4 w-4" />
								Import
							</Link>
						</Button>
					</div>
				</div>

				<AccountPrompt variant="banner" />

				{calendars.length === 0 ? (
					<Card id={TOUR_STEP_IDS.CALENDAR_GRID}>
						<CardContent className="py-16 text-center">
							<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
								<Calendar className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="mb-2 font-semibold text-lg">No calendars yet</h3>
							<p className="mb-6 text-muted-foreground">
								Create your first calendar or import an existing .ics file.
							</p>
							<div className="flex justify-center gap-3">
								<Button onClick={() => navigate({ to: "/calendars/new" })}>
									<Plus className="mr-2 h-4 w-4" />
									Create a calendar
								</Button>
								<Button variant="outline" asChild>
									<Link to="/calendars/import">
										<FileUp className="mr-2 h-4 w-4" />
										Import a .ics
									</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				) : (
					<div id={TOUR_STEP_IDS.CALENDAR_GRID}>
						<StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{calendars.map((calendar) => (
								<StaggerItem key={calendar.id}>
									<CalendarCard
										calendar={calendar}
										onOpen={() => navigate({ to: `/calendars/${calendar.id}` })}
										onEdit={() =>
											openEditDialog(calendar.id, calendar.name, calendar.color)
										}
										onDelete={() =>
											openDeleteDialog(calendar.id, calendar.name)
										}
										isDeleting={isDeleting}
										isUpdating={isUpdating}
									/>
								</StaggerItem>
							))}
						</StaggerContainer>
					</div>
				)}

				{/* Delete Dialog */}
				<AlertDialog
					open={dialog?.type === "delete"}
					onOpenChange={(open) => !open && closeDialog()}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete calendar</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete "
								{dialog?.type === "delete" ? dialog.calendar.name : ""}"? This
								action is irreversible and will delete all associated events.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={confirmDelete}
								disabled={isDeleting}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Edit Dialog */}
				<AlertDialog
					open={dialog?.type === "edit"}
					onOpenChange={(open) => !open && closeDialog()}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Edit calendar</AlertDialogTitle>
							<AlertDialogDescription>
								Edit calendar settings for "
								{dialog?.type === "edit" ? dialog.calendar.name : ""}"
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="calendar-name">Name</Label>
								<Input
									id="calendar-name"
									value={dialog?.type === "edit" ? dialog.newName : ""}
									onChange={(e) => handleEditNameChange(e.target.value)}
									placeholder="Calendar name"
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											confirmEdit();
										}
									}}
								/>
							</div>
							<ColorPicker
								value={dialog?.type === "edit" ? dialog.newColor : null}
								onChange={handleEditColorChange}
								label="Color"
							/>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={confirmEdit} disabled={isUpdating}>
								{isUpdating ? "Saving..." : "Save"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}

// Improved Calendar Card Component
interface CalendarCardProps {
	calendar: {
		id: string;
		name: string;
		eventCount: number;
		color?: string | null;
		sourceUrl?: string | null;
		lastSyncedAt?: string | Date | null;
		events?: Array<{
			id: string;
			title: string;
			startDate: string | Date;
		}>;
	};
	onOpen: () => void;
	onEdit: () => void;
	onDelete: () => void;
	isDeleting: boolean;
	isUpdating: boolean;
}

/**
 * Format date for calendar card preview
 * Shows contextual labels: "Today", "Tomorrow", or date
 */
function formatCardDate(date: string | Date): string {
	const d = new Date(date);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const eventDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

	if (eventDate.getTime() === today.getTime()) {
		return "Today";
	}
	if (eventDate.getTime() === tomorrow.getTime()) {
		return "Tomorrow";
	}
	return format(d, "MMM d", { locale: enUS });
}

function CalendarCard({
	calendar,
	onOpen,
	onEdit,
	onDelete,
	isDeleting,
	isUpdating,
}: CalendarCardProps) {
	// Get upcoming events (up to 3)
	const now = new Date();
	const upcomingEvents =
		calendar.events?.filter((e) => new Date(e.startDate) >= now).slice(0, 3) ||
		[];

	// Get the next event for highlight
	const nextEvent = upcomingEvents[0];
	const isNextEventToday =
		nextEvent &&
		new Date(nextEvent.startDate).toDateString() === now.toDateString();

	return (
		<Card
			className={cn(
				"group relative cursor-pointer overflow-hidden transition-all duration-200",
				"hover:border-primary/30 hover:shadow-lg",
			)}
			onClick={onOpen}
		>
			{/* Color accent - left border instead of top for more subtle look */}
			<div
				className="absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-1.5"
				style={{ backgroundColor: calendar.color || "#c2703c" }}
			/>

			<CardHeader className="pb-2 pl-5">
				<div className="flex items-start justify-between">
					<div className="min-w-0 flex-1 pr-8">
						<CardTitle className="line-clamp-1 text-base">
							{calendar.name}
						</CardTitle>
						<CardDescription className="mt-0.5 flex items-center gap-2">
							<span>
								{calendar.eventCount} event
								{calendar.eventCount !== 1 ? "s" : ""}
							</span>
							{calendar.sourceUrl && (
								<span
									className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 font-medium text-blue-600 text-xs dark:text-blue-400"
									title={`Subscribed to ${calendar.sourceUrl}`}
								>
									<Globe className="h-3 w-3" />
									Subscribed
								</span>
							)}
							{isNextEventToday && (
								<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs">
									<span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
									Today
								</span>
							)}
						</CardDescription>
					</div>

					{/* Actions Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
							<Button
								variant="ghost"
								size="icon"
								className="absolute top-2 right-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onOpen();
								}}
							>
								<ExternalLink className="mr-2 h-4 w-4" />
								Open
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onEdit();
								}}
								disabled={isUpdating}
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onDelete();
								}}
								disabled={isDeleting}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>

			<CardContent className="pt-0 pl-5">
				{/* Upcoming events preview - improved layout */}
				{upcomingEvents.length > 0 ? (
					<div className="space-y-1">
						{upcomingEvents.map((event, index) => {
							const isToday =
								new Date(event.startDate).toDateString() === now.toDateString();
							return (
								<div
									key={event.id}
									className={cn(
										"flex items-center gap-2 text-xs",
										index === 0 ? "text-foreground" : "text-muted-foreground",
									)}
								>
									<span
										className={cn(
											"w-10 shrink-0 text-right font-medium",
											isToday && "text-primary",
										)}
									>
										{formatCardDate(event.startDate)}
									</span>
									<span
										className="h-1 w-1 shrink-0 rounded-full"
										style={{ backgroundColor: calendar.color || "#c2703c" }}
									/>
									<span className="truncate">{event.title}</span>
								</div>
							);
						})}
						{calendar.eventCount > 3 && (
							<p className="mt-1 text-muted-foreground/60 text-xs">
								+{calendar.eventCount - 3} others
							</p>
						)}
					</div>
				) : (
					<p className="py-2 text-center text-muted-foreground/50 text-xs italic">
						No upcoming events
					</p>
				)}
			</CardContent>
		</Card>
	);
}
