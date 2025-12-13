import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	stripSearchParams,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { AnimatePresence } from "motion/react";
import { AccountPrompt } from "@/components/account-prompt";
import { CalendarBulkActionsBar } from "@/components/calendar-list/bulk-actions-bar";
import {
	CalendarSearchSortBar,
	type CalendarSortBy,
	type CalendarSortDirection,
} from "@/components/calendar-list/calendar-filters";
import { CalendarsSection } from "@/components/calendar-list/calendars-section";
import { CreateGroupDialog } from "@/components/calendar-list/create-group-dialog";
import { GroupsSection } from "@/components/calendar-list/groups-section";
import { CalendarsListHeader } from "@/components/calendar-list/header";
import { CalendarsListLoadingState } from "@/components/calendar-list/loading-state";
import { ShareCalendarsDialog } from "@/components/share-calendars-dialog";
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
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDialogHandlers } from "@/hooks/use-calendar-dialogs";
import { useGroupHandlers } from "@/hooks/use-calendar-groups";
import { useSearchSortHandlers } from "@/hooks/use-calendar-search-sort";
import { useSelectionHandlers } from "@/hooks/use-calendar-selection";
import { useCalendraftTour } from "@/hooks/use-calendraft-tour";
import {
	useCalendars,
	useDeleteCalendar,
	useUpdateCalendar,
} from "@/hooks/use-storage";
import {
	type CalendarForSort,
	filterCalendarsByKeyword,
	sortCalendars,
} from "@/lib/calendar-sort";
import {
	calendarsListDefaults,
	calendarsListSearchSchema,
} from "@/lib/search-params";
import { trpc } from "@/utils/trpc";

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

/**
 * All dialogs component
 */
function CalendarsListDialogs({
	dialogHandlers,
	groupHandlers,
	groupDetailsForShare,
	isDeleting,
	isUpdating,
}: {
	dialogHandlers: ReturnType<typeof useDialogHandlers>;
	groupHandlers: ReturnType<typeof useGroupHandlers>;
	groupDetailsForShare:
		| {
				calendars: Array<{ id: string }>;
		  }
		| undefined;
	isDeleting: boolean;
	isUpdating: boolean;
}) {
	return (
		<>
			{/* Delete Dialog */}
			<AlertDialog
				open={dialogHandlers.dialog?.type === "delete"}
				onOpenChange={(open) => !open && dialogHandlers.closeDialog()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete calendar</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "
							{dialogHandlers.dialog?.type === "delete"
								? dialogHandlers.dialog.calendar.name
								: ""}
							"? This action is irreversible and will delete all associated
							events.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={dialogHandlers.confirmDelete}
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
				open={dialogHandlers.dialog?.type === "edit"}
				onOpenChange={(open) => !open && dialogHandlers.closeDialog()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Edit calendar</AlertDialogTitle>
						<AlertDialogDescription>
							Edit calendar settings for "
							{dialogHandlers.dialog?.type === "edit"
								? dialogHandlers.dialog.calendar.name
								: ""}
							"
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="calendar-name">Name</Label>
							<Input
								id="calendar-name"
								value={
									dialogHandlers.dialog?.type === "edit"
										? dialogHandlers.dialog.newName
										: ""
								}
								onChange={(e) =>
									dialogHandlers.handleEditNameChange(e.target.value)
								}
								placeholder="Calendar name"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										dialogHandlers.confirmEdit();
									}
								}}
							/>
						</div>
						<ColorPicker
							value={
								dialogHandlers.dialog?.type === "edit"
									? dialogHandlers.dialog.newColor
									: null
							}
							onChange={dialogHandlers.handleEditColorChange}
							label="Color"
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={dialogHandlers.confirmEdit}
							disabled={isUpdating}
						>
							{isUpdating ? "Saving..." : "Save"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Create group dialog */}
			<CreateGroupDialog
				open={groupHandlers.createGroupDialogOpen}
				onOpenChange={groupHandlers.setCreateGroupDialogOpen}
			/>

			{/* Edit group dialog */}
			{groupHandlers.groupToEdit && (
				<CreateGroupDialog
					open={groupHandlers.editGroupDialogOpen}
					onOpenChange={(open) => {
						groupHandlers.setEditGroupDialogOpen(open);
						if (!open) {
							groupHandlers.setGroupToEdit(null);
						}
					}}
					groupToEdit={groupHandlers.groupToEdit}
				/>
			)}

			{/* Share group dialog */}
			{groupDetailsForShare && (
				<ShareCalendarsDialog
					calendarIds={
						Array.isArray(groupDetailsForShare.calendars)
							? groupDetailsForShare.calendars.map((c) => c.id)
							: []
					}
					groupId={groupHandlers.groupToShare || undefined}
					open={groupHandlers.shareGroupDialogOpen}
					onOpenChange={(open) => {
						groupHandlers.setShareGroupDialogOpen(open);
						if (!open) {
							groupHandlers.setGroupToShare(null);
						}
					}}
				/>
			)}

			{/* Delete group dialog */}
			<AlertDialog
				open={groupHandlers.deleteGroupDialogOpen}
				onOpenChange={groupHandlers.setDeleteGroupDialogOpen}
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
								if (groupHandlers.groupToDelete) {
									groupHandlers.deleteGroupMutation.mutate({
										id: groupHandlers.groupToDelete,
									});
									groupHandlers.setDeleteGroupDialogOpen(false);
									groupHandlers.setGroupToDelete(null);
								}
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

/**
 * Render calendars list content
 */
function CalendarsListContent({
	calendars,
	groups,
	isLoadingGroups,
	keyword,
	sortBy,
	sortDirection,
	navigate,
	selectionHandlers,
	searchSortHandlers,
	groupHandlers,
	dialogHandlers,
	isDeleting,
	isUpdating,
}: {
	calendars: CalendarForSort[];
	groups:
		| Array<{
				id: string;
				name: string;
				description?: string | null;
				color?: string | null;
		  }>
		| undefined;
	isLoadingGroups: boolean;
	keyword: string;
	sortBy: CalendarSortBy;
	sortDirection: CalendarSortDirection;
	navigate: ReturnType<typeof useNavigate>;
	selectionHandlers: ReturnType<typeof useSelectionHandlers>;
	searchSortHandlers: ReturnType<typeof useSearchSortHandlers>;
	groupHandlers: ReturnType<typeof useGroupHandlers>;
	dialogHandlers: ReturnType<typeof useDialogHandlers>;
	isDeleting: boolean;
	isUpdating: boolean;
}) {
	return (
		<>
			<AccountPrompt variant="banner" />

			{/* Search and sort */}
			{calendars.length > 0 && (
				<div className="mb-4">
					<CalendarSearchSortBar
						keyword={keyword}
						sortBy={sortBy}
						sortDirection={sortDirection}
						onKeywordChange={searchSortHandlers.handleKeywordChange}
						onSortChange={searchSortHandlers.handleSortChange}
						onSortDirectionChange={searchSortHandlers.handleSortDirectionChange}
						showDirectionToggle={
							sortBy === "updatedAt" || sortBy === "createdAt"
						}
					/>
				</div>
			)}

			{/* Bulk actions bar */}
			<AnimatePresence>
				{selectionHandlers.selectionMode && (
					<CalendarBulkActionsBar
						selectedCount={selectionHandlers.selectedIds.size}
						totalCount={calendars.length}
						selectedIds={selectionHandlers.selectedIds}
						onSelectAll={selectionHandlers.handleSelectAll}
						onDeselectAll={selectionHandlers.handleDeselectAll}
						onExitSelectionMode={selectionHandlers.handleExitSelectionMode}
					/>
				)}
			</AnimatePresence>

			{/* Groups section */}
			{!isLoadingGroups && groups && (
				<GroupsSection groups={groups} groupHandlers={groupHandlers} />
			)}

			{/* Calendars section */}
			<CalendarsSection
				calendars={calendars}
				navigate={navigate}
				dialogHandlers={dialogHandlers}
				selectionHandlers={selectionHandlers}
				isDeleting={isDeleting}
				isUpdating={isUpdating}
			/>
		</>
	);
}

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
	// React Compiler will automatically memoize this computation
	const calendars = (() => {
		// Ensure allCalendars is always an array
		const calendarsArray = Array.isArray(allCalendars) ? allCalendars : [];
		const filtered = filterCalendarsByKeyword(calendarsArray, keyword);
		return sortCalendars(filtered, sortBy, sortDirection);
	})();
	const { deleteCalendar, isDeleting } = useDeleteCalendar();
	const { updateCalendar, isUpdating } = useUpdateCalendar();

	// Tour state
	const { openDialog: tourOpen, setOpenDialog: setTourOpen } =
		useCalendraftTour();

	// Dialog handlers
	const dialogHandlers = useDialogHandlers(deleteCalendar, updateCalendar);

	// Selection mode handlers
	const selectionHandlers = useSelectionHandlers(calendars);

	// Groups state and handlers
	const groupHandlers = useGroupHandlers(navigate, queryClient);

	// Get groups
	const { data: groups, isLoading: isLoadingGroups } = useQuery({
		...trpc.calendar.group.list.queryOptions(),
	});

	// Get group details for sharing
	const { data: groupDetailsForShare } = useQuery({
		...trpc.calendar.group.getById.queryOptions({
			id: groupHandlers.groupToShare || "",
		}),
		enabled: !!groupHandlers.groupToShare && groupHandlers.shareGroupDialogOpen,
	});

	// Search and sort handlers
	const searchSortHandlers = useSearchSortHandlers(
		navigate,
		search,
		sortDirection,
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
		return <CalendarsListLoadingState />;
	}

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			{/* Subtle background pattern */}
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
				<div className="cross-grid absolute inset-0 opacity-20 [mask-image:linear-gradient(to_bottom,#000_0%,transparent_50%)]" />
			</div>

			<div className="container mx-auto max-w-5xl px-4 py-6 sm:py-10">
				{/* Tour dialog */}
				<TourAlertDialog isOpen={tourOpen} setIsOpen={setTourOpen} />

				<CalendarsListHeader
					calendars={calendars}
					navigate={navigate}
					groupHandlers={groupHandlers}
					selectionHandlers={selectionHandlers}
				/>

				<CalendarsListContent
					calendars={calendars}
					groups={groups}
					isLoadingGroups={isLoadingGroups}
					keyword={keyword}
					sortBy={sortBy as CalendarSortBy}
					sortDirection={sortDirection as CalendarSortDirection}
					navigate={navigate}
					selectionHandlers={selectionHandlers}
					searchSortHandlers={searchSortHandlers}
					groupHandlers={groupHandlers}
					dialogHandlers={dialogHandlers}
					isDeleting={isDeleting}
					isUpdating={isUpdating}
				/>

				<CalendarsListDialogs
					dialogHandlers={dialogHandlers}
					groupHandlers={groupHandlers}
					groupDetailsForShare={groupDetailsForShare}
					isDeleting={isDeleting}
					isUpdating={isUpdating}
				/>
			</div>
		</div>
	);
}
