import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	Outlet,
	stripSearchParams,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Calendar,
	CheckSquare,
	Edit,
	ExternalLink,
	FileUp,
	Folder,
	Globe,
	MoreHorizontal,
	Plus,
	Trash2,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AccountPrompt } from "@/components/account-prompt";
import { CalendarBulkActionsBar } from "@/components/calendar-list/bulk-actions-bar";
import {
	CalendarSearchSortBar,
	type CalendarSortBy,
	type CalendarSortDirection,
} from "@/components/calendar-list/calendar-filters";
import { CreateGroupDialog } from "@/components/calendar-list/create-group-dialog";
import { CalendarGroupBadges } from "@/components/calendar-list/group-badges";
import { CalendarGroupCard } from "@/components/calendar-list/group-card";
import { StaggerContainer, StaggerItem } from "@/components/page-transition";
import { ShareCalendarsDialog } from "@/components/share-calendars-dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	useCalendars,
	useDeleteCalendar,
	useUpdateCalendar,
} from "@/hooks/use-storage";
import {
	calendarsListDefaults,
	calendarsListSearchSchema,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { trpc, trpcClient } from "@/utils/trpc";

const BASE_URL = "https://calendraft.app";

export const Route = createFileRoute("/calendars")({
	component: CalendarsListComponent,
	validateSearch: zodValidator(calendarsListSearchSchema),
	search: {
		middlewares: [stripSearchParams(calendarsListDefaults)],
	},
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
	const queryClient = useQueryClient();
	const search = Route.useSearch();

	// Parse filters from URL
	const keyword = search.q || "";
	const sortBy = search.sortBy || "updatedAt";
	const sortDirection = search.sortDirection || "desc";

	// Get calendars
	const { calendars: allCalendars, isLoading } = useCalendars();

	// Filter and sort calendars
	const calendars = useMemo(() => {
		let filtered = allCalendars;

		// Filter by keyword (name search)
		if (keyword.trim()) {
			const searchLower = keyword.trim().toLowerCase();
			filtered = filtered.filter((cal) =>
				cal.name.toLowerCase().includes(searchLower),
			);
		}

		// Sort calendars
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "name":
					return a.name.localeCompare(b.name);
				case "updatedAt": {
					const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
					const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
					return sortDirection === "asc"
						? aUpdated - bUpdated
						: bUpdated - aUpdated;
				}
				case "createdAt": {
					const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
					const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
					return sortDirection === "asc"
						? aCreated - bCreated
						: bCreated - aCreated;
				}
				case "eventCount":
					return a.eventCount - b.eventCount;
				default:
					return 0;
			}
		});

		return sorted;
	}, [allCalendars, keyword, sortBy, sortDirection]);
	const { deleteCalendar, isDeleting } = useDeleteCalendar();
	const { updateCalendar, isUpdating } = useUpdateCalendar();

	// Single state for all dialogs
	const [dialog, setDialog] = useState<DialogState>(null);

	// Selection mode state
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	// Groups state
	const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
	const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
	const [groupToEdit, setGroupToEdit] = useState<{
		id: string;
		name: string;
		description?: string | null;
		color?: string | null;
	} | null>(null);
	const [shareGroupDialogOpen, setShareGroupDialogOpen] = useState(false);
	const [groupToShare, setGroupToShare] = useState<string | null>(null);
	const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
	const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

	// Get groups
	const { data: groups, isLoading: isLoadingGroups } = useQuery({
		...trpc.calendar.group.list.queryOptions(),
	});

	// Get group details for sharing
	const { data: groupDetailsForShare } = useQuery({
		...trpc.calendar.group.getById.queryOptions({ id: groupToShare || "" }),
		enabled: !!groupToShare && shareGroupDialogOpen,
	});

	// Delete group mutation
	const deleteGroupMutation = useMutation(
		trpc.calendar.group.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("Group deleted");
			},
			onError: (error) => {
				toast.error(error.message || "Error deleting group");
			},
		}),
	);

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

	const confirmEdit = useCallback(async () => {
		if (dialog?.type === "edit") {
			const trimmedName = dialog.newName.trim();
			if (trimmedName) {
				// Update calendar name and color
				await updateCalendar({
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

	// Selection handlers
	const handleToggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		setSelectedIds(new Set(calendars.map((c) => c.id)));
	}, [calendars]);

	const handleDeselectAll = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const handleExitSelectionMode = useCallback(() => {
		setSelectionMode(false);
		setSelectedIds(new Set());
	}, []);

	const handleEnterSelectionMode = useCallback(() => {
		setSelectionMode(true);
	}, []);

	// Search and sort handlers
	const handleKeywordChange = useCallback(
		(newKeyword: string) => {
			navigate({
				search: {
					...search,
					q: newKeyword || undefined,
				},
			});
		},
		[navigate, search],
	);

	const handleSortChange = useCallback(
		(newSortBy: CalendarSortBy) => {
			// Reset sortDirection to "desc" when changing sort type (except for date-based sorts)
			const shouldShowDirection =
				newSortBy === "updatedAt" || newSortBy === "createdAt";
			navigate({
				search: {
					...search,
					sortBy: newSortBy,
					sortDirection: shouldShowDirection ? sortDirection : "desc",
				},
			});
		},
		[navigate, search, sortDirection],
	);

	const handleSortDirectionChange = useCallback(
		(newDirection: CalendarSortDirection) => {
			navigate({
				search: {
					...search,
					sortDirection: newDirection,
				},
			});
		},
		[navigate, search],
	);

	// Group handlers
	const handleCreateGroup = useCallback(() => {
		setCreateGroupDialogOpen(true);
	}, []);

	const handleEditGroup = useCallback(
		(group: {
			id: string;
			name: string;
			description?: string | null;
			color?: string | null;
		}) => {
			setGroupToEdit(group);
			setEditGroupDialogOpen(true);
		},
		[],
	);

	const handleDeleteGroup = useCallback((groupId: string) => {
		setGroupToDelete(groupId);
		setDeleteGroupDialogOpen(true);
	}, []);

	const handleShareGroup = useCallback((groupId: string) => {
		setGroupToShare(groupId);
		setShareGroupDialogOpen(true);
	}, []);

	const handleMergeGroup = useCallback(
		async (groupId: string) => {
			try {
				// Get group details and navigate to merge page
				const group = await trpcClient.calendar.group.getById.query({
					id: groupId,
				});
				const calendarIds = group.calendars.map((c) => c.id).join(",");
				navigate({
					to: "/calendars/merge",
					search: { selected: calendarIds },
				});
			} catch (_error) {
				toast.error("Error loading group details");
			}
		},
		[navigate],
	);

	const handleExportGroup = useCallback(async (groupId: string) => {
		try {
			const group = await trpcClient.calendar.group.getById.query({
				id: groupId,
			});
			if (group.calendars.length === 0) {
				toast.error("No calendars to export");
				return;
			}

			// Create a temporary bundle for export
			const bundle = await trpcClient.share.bundle.create.mutate({
				groupId: groupId,
				removeDuplicates: false,
			});

			// Get the ICS content
			const data = await trpcClient.share.bundle.getByToken.query({
				token: bundle.token,
			});

			// Create blob and download
			const blob = new Blob([data.icsContent], { type: "text/calendar" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${group.name.replace(/[^a-z0-9]/gi, "_")}.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			// Clean up the temporary bundle
			await trpcClient.share.bundle.delete.mutate({ id: bundle.id });

			toast.success("Group exported successfully");
		} catch (_error) {
			toast.error("Error exporting group");
		}
	}, []);

	const handleViewGroup = useCallback(
		(groupId: string) => {
			navigate({ to: `/calendars/groups/${groupId}` });
		},
		[navigate],
	);

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
				<div className="mb-6 flex flex-wrap items-center gap-4">
					<h1 className="text-heading-1">My calendars</h1>
					<div className="ml-auto flex flex-wrap items-center gap-2">
						{/* Primary action */}
						<Button
							onClick={() => navigate({ to: "/calendars/new" })}
							size="sm"
						>
							<Plus className="mr-2 h-4 w-4" />
							New calendar
						</Button>
						{/* Secondary actions */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleCreateGroup}
							disabled={calendars.length === 0}
						>
							<Folder className="mr-2 h-4 w-4" />
							New group
						</Button>
						<Button variant="outline" size="sm" asChild>
							<Link to="/calendars/import">
								<FileUp className="mr-2 h-4 w-4" />
								Import
							</Link>
						</Button>
						{/* Selection mode toggle - pushed to the right when space allows */}
						{calendars.length > 0 && !selectionMode && (
							<Button
								variant="outline"
								size="sm"
								onClick={handleEnterSelectionMode}
							>
								<CheckSquare className="mr-2 h-4 w-4" />
								Select
							</Button>
						)}
					</div>
				</div>

				<AccountPrompt variant="banner" />

				{/* Search and sort */}
				{calendars.length > 0 && (
					<div className="mb-4">
						<CalendarSearchSortBar
							keyword={keyword}
							sortBy={sortBy as CalendarSortBy}
							sortDirection={sortDirection as CalendarSortDirection}
							onKeywordChange={handleKeywordChange}
							onSortChange={handleSortChange}
							onSortDirectionChange={handleSortDirectionChange}
							showDirectionToggle={
								sortBy === "updatedAt" || sortBy === "createdAt"
							}
						/>
					</div>
				)}

				{/* Bulk actions bar */}
				<AnimatePresence>
					{selectionMode && (
						<CalendarBulkActionsBar
							selectedCount={selectedIds.size}
							totalCount={calendars.length}
							selectedIds={selectedIds}
							onSelectAll={handleSelectAll}
							onDeselectAll={handleDeselectAll}
							onExitSelectionMode={handleExitSelectionMode}
						/>
					)}
				</AnimatePresence>

				{/* Groups section */}
				{!isLoadingGroups && groups && groups.length > 0 && (
					<div className="mb-8">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-heading-2">Groups</h2>
						</div>
						<StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{groups.map((group) => (
								<StaggerItem key={group.id}>
									<CalendarGroupCard
										group={group}
										onOpen={() => handleViewGroup(group.id)}
										onEdit={() => handleEditGroup(group)}
										onDelete={() => handleDeleteGroup(group.id)}
										onMerge={() => handleMergeGroup(group.id)}
										onExport={() => handleExportGroup(group.id)}
										onShare={() => handleShareGroup(group.id)}
										isDeleting={deleteGroupMutation.isPending}
									/>
								</StaggerItem>
							))}
						</StaggerContainer>
					</div>
				)}

				{/* Calendars section */}
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-heading-2">Calendars</h2>
				</div>

				{calendars.length === 0 ? (
					<Card>
						<CardContent className="py-16 text-center">
							<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
								<Calendar className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="mb-2 text-heading-3">No calendars yet</h3>
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
					<div>
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
										selectionMode={selectionMode}
										isSelected={selectedIds.has(calendar.id)}
										onToggleSelect={handleToggleSelect}
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
								variant="destructive"
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

				{/* Create group dialog */}
				<CreateGroupDialog
					open={createGroupDialogOpen}
					onOpenChange={setCreateGroupDialogOpen}
				/>

				{/* Edit group dialog */}
				{groupToEdit && (
					<CreateGroupDialog
						open={editGroupDialogOpen}
						onOpenChange={(open) => {
							setEditGroupDialogOpen(open);
							if (!open) {
								setGroupToEdit(null);
							}
						}}
						groupToEdit={groupToEdit}
					/>
				)}

				{/* Share group dialog */}
				{groupDetailsForShare && (
					<ShareCalendarsDialog
						calendarIds={groupDetailsForShare.calendars.map((c) => c.id)}
						groupId={groupToShare || undefined}
						open={shareGroupDialogOpen}
						onOpenChange={(open) => {
							setShareGroupDialogOpen(open);
							if (!open) {
								setGroupToShare(null);
							}
						}}
					/>
				)}

				{/* Delete group dialog */}
				<AlertDialog
					open={deleteGroupDialogOpen}
					onOpenChange={setDeleteGroupDialogOpen}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete group?</AlertDialogTitle>
							<AlertDialogDescription>
								This will delete the group. The calendars in this group will not
								be deleted, only the group itself.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									if (groupToDelete) {
										deleteGroupMutation.mutate({ id: groupToDelete });
										setDeleteGroupDialogOpen(false);
										setGroupToDelete(null);
									}
								}}
								variant="destructive"
							>
								Delete
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
	/** Selection mode props */
	selectionMode?: boolean;
	isSelected?: boolean;
	onToggleSelect?: (id: string) => void;
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
	selectionMode = false,
	isSelected = false,
	onToggleSelect,
}: CalendarCardProps) {
	const handleNavigate = useCallback(() => {
		if (selectionMode) {
			onToggleSelect?.(calendar.id);
		} else {
			onOpen();
		}
	}, [selectionMode, onToggleSelect, calendar.id, onOpen]);

	const handleCheckboxChange = useCallback(
		(_checked: boolean) => {
			onToggleSelect?.(calendar.id);
		},
		[onToggleSelect, calendar.id],
	);
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
				selectionMode && "cursor-pointer",
				isSelected && "bg-primary/5 ring-2 ring-primary",
			)}
			onClick={selectionMode ? handleNavigate : onOpen}
		>
			{/* Color accent - left border instead of top for more subtle look */}
			<div
				className="absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-1.5"
				style={{ backgroundColor: calendar.color || "#D4A017" }}
			/>

			<CardHeader className="pb-2 pl-5">
				<div className="flex items-start justify-between">
					{/* Selection checkbox */}
					{selectionMode && (
						<div className="mr-3 flex items-center pt-0.5">
							<Checkbox
								checked={isSelected}
								onCheckedChange={handleCheckboxChange}
								onClick={(e) => e.stopPropagation()}
								aria-label={`Select ${calendar.name}`}
							/>
						</div>
					)}
					<div className="min-w-0 flex-1 pr-8">
						<CardTitle className="line-clamp-1 text-card-title">
							{calendar.name}
						</CardTitle>
						<CalendarGroupBadges calendarId={calendar.id} />
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

					{/* Actions Menu - hide in selection mode */}
					{!selectionMode && (
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
					)}
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
										style={{ backgroundColor: calendar.color || "#D4A017" }}
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
