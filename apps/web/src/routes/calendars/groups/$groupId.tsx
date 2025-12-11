import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Download,
	Edit,
	GitMerge,
	Link2,
	Loader2,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AccountPrompt } from "@/components/account-prompt";
import {
	CalendarSearchSortBar,
	type CalendarSortBy,
} from "@/components/calendar-list/calendar-filters";
import { CreateGroupDialog } from "@/components/calendar-list/create-group-dialog";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc, trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/calendars/groups/$groupId")({
	component: GroupDetailComponent,
	head: () => ({
		meta: [
			{ title: "Group - Calendraft" },
			{ name: "robots", content: "noindex, nofollow" },
		],
	}),
});

type CalendarForGroupSort = {
	id: string;
	name: string;
	color?: string | null;
	eventCount: number;
};

/**
 * Filter calendars by keyword
 */
function filterGroupCalendarsByKeyword(
	calendars: CalendarForGroupSort[],
	keyword: string,
): CalendarForGroupSort[] {
	if (!keyword.trim()) {
		return calendars;
	}
	const searchLower = keyword.trim().toLowerCase();
	return calendars.filter((cal) =>
		cal.name.toLowerCase().includes(searchLower),
	);
}

/**
 * Sort calendars in group
 */
function sortGroupCalendars(
	calendars: CalendarForGroupSort[],
	sortBy: CalendarSortBy,
): CalendarForGroupSort[] {
	const sorted = [...calendars];
	if (sortBy === "name") {
		sorted.sort((a, b) => a.name.localeCompare(b.name));
	} else if (sortBy === "eventCount") {
		sorted.sort((a, b) => a.eventCount - b.eventCount);
	}
	return sorted;
}

/**
 * Export group as ICS file
 */
async function exportGroupAsICS(
	groupId: string,
	groupName: string,
): Promise<void> {
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
	a.download = `${groupName.replace(/[^a-z0-9]/gi, "_")}.ics`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	// Clean up the temporary bundle
	await trpcClient.share.bundle.delete.mutate({ id: bundle.id });
}

/**
 * Render calendars grid or empty states
 */
function renderCalendarsGrid(
	calendarsArray: Array<{
		id: string;
		name: string;
		color?: string | null;
		eventCount: number;
	}>,
	filteredCalendars: Array<{
		id: string;
		name: string;
		color?: string | null;
		eventCount: number;
	}>,
	onCalendarClick: (id: string) => void,
	onEdit: () => void,
) {
	if (calendarsArray.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No calendars in this group</CardTitle>
					<CardDescription>
						Add calendars to this group to get started.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={onEdit} variant="outline">
						<Plus className="mr-2 h-4 w-4" />
						Add calendars
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (filteredCalendars.length === 0) {
		return (
			<Card>
				<CardContent className="py-10 text-center">
					<p className="text-muted-foreground">
						No calendars match your search
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{filteredCalendars.map((calendar) => (
				<Card
					key={calendar.id}
					className="group relative cursor-pointer overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-lg"
					onClick={() => onCalendarClick(calendar.id)}
				>
					{/* Color accent */}
					<div
						className="absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-1.5"
						style={{ backgroundColor: calendar.color || "#D4A017" }}
					/>

					<CardHeader className="pb-2 pl-6">
						<CardTitle className="line-clamp-1 text-card-title">
							{calendar.name}
						</CardTitle>
						<CardDescription>
							{calendar.eventCount} event
							{calendar.eventCount !== 1 ? "s" : ""}
						</CardDescription>
					</CardHeader>
				</Card>
			))}
		</div>
	);
}

function GroupDetailComponent() {
	const { groupId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [_exportDialogOpen, _setExportDialogOpen] = useState(false);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [sortBy, setSortBy] = useState<CalendarSortBy>("name");

	// Fetch group details
	const { data: group, isLoading } = useQuery({
		...trpc.calendar.group.getById.queryOptions({ id: groupId }),
	});

	// Ensure calendars is always an array
	const calendarsArray = Array.isArray(group?.calendars) ? group.calendars : [];

	// Filter and sort calendars in the group
	// React Compiler will automatically memoize this computation
	const filteredCalendars = (() => {
		if (!calendarsArray.length) return [];
		const filtered = filterGroupCalendarsByKeyword(
			calendarsArray,
			searchKeyword,
		);
		return sortGroupCalendars(filtered, sortBy);
	})();

	// Delete mutation
	const deleteMutation = useMutation(
		trpc.calendar.group.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: [["calendar", "group"]],
				});
				toast.success("Group deleted");
				navigate({ to: "/calendars" });
			},
			onError: (error) => {
				toast.error(error.message || "Error deleting group");
			},
		}),
	);

	// React Compiler will automatically memoize these callbacks
	const handleEdit = () => {
		if (group) {
			setEditDialogOpen(true);
		}
	};

	const handleDelete = () => {
		setDeleteDialogOpen(true);
	};

	const handleShare = () => {
		setShareDialogOpen(true);
	};

	const handleMerge = () => {
		if (group && calendarsArray.length > 0) {
			const calendarIds = calendarsArray.map((c) => c.id).join(",");
			navigate({
				to: "/calendars/merge",
				search: { selected: calendarIds },
			});
		}
	};

	const handleExport = async () => {
		if (!group || calendarsArray.length === 0) {
			toast.error("No calendars to export");
			return;
		}

		try {
			await exportGroupAsICS(groupId, group.name);
			toast.success("Group exported successfully");
		} catch (_error) {
			toast.error("Error exporting group");
		}
	};

	if (isLoading) {
		return (
			<div className="relative min-h-[calc(100vh-4rem)]">
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-30" />
				</div>
				<div className="container mx-auto max-w-6xl px-4 py-10">
					<Skeleton className="mb-4 h-8 w-64" />
					<Skeleton className="mb-8 h-32 w-full" />
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-32" />
						))}
					</div>
				</div>
			</div>
		);
	}

	if (!group) {
		return (
			<div className="relative min-h-[calc(100vh-4rem)]">
				<div className="-z-10 pointer-events-none absolute inset-0">
					<div className="gradient-mesh absolute inset-0 opacity-30" />
				</div>
				<div className="container mx-auto max-w-6xl px-4 py-10">
					<div className="text-center text-muted-foreground">
						Group not found
					</div>
				</div>
			</div>
		);
	}

	const totalEvents = calendarsArray.reduce(
		(sum, cal) => sum + cal.eventCount,
		0,
	);

	return (
		<div className="relative min-h-[calc(100vh-4rem)]">
			<div className="-z-10 pointer-events-none absolute inset-0">
				<div className="gradient-mesh absolute inset-0 opacity-30" />
			</div>

			<div className="container mx-auto max-w-6xl px-4 py-10">
				<AccountPrompt variant="banner" />

				{/* Header */}
				<div className="mb-6 flex flex-wrap items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/calendars" })}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-3">
							<div
								className="h-4 w-4 shrink-0 rounded-full"
								style={{ backgroundColor: group.color || "#8b5cf6" }}
							/>
							<h1 className="text-heading-1">{group.name}</h1>
						</div>
						{group.description && (
							<p className="mt-1 text-muted-foreground">{group.description}</p>
						)}
						<p className="mt-1 text-muted-foreground text-sm">
							{calendarsArray.length} calendar
							{calendarsArray.length !== 1 ? "s" : ""} • {totalEvents} event
							{totalEvents !== 1 ? "s" : ""}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						{/* Primary action */}
						<Button variant="outline" size="sm" onClick={handleEdit}>
							<Edit className="mr-2 h-4 w-4" />
							Edit
						</Button>
						{/* Secondary actions */}
						<Button
							variant="outline"
							size="sm"
							onClick={handleShare}
							disabled={calendarsArray.length === 0}
						>
							<Link2 className="mr-2 h-4 w-4" />
							Share
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={calendarsArray.length === 0}
						>
							<Download className="mr-2 h-4 w-4" />
							Export
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleMerge}
							disabled={calendarsArray.length < 2}
						>
							<GitMerge className="mr-2 h-4 w-4" />
							Merge
						</Button>
						{/* Destructive action */}
						<Button
							variant="destructive"
							size="sm"
							onClick={handleDelete}
							disabled={deleteMutation.isPending}
						>
							{deleteMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Trash2 className="mr-2 h-4 w-4" />
							)}
							Delete
						</Button>
					</div>
				</div>

				{/* Search and sort */}
				{calendarsArray.length > 0 && (
					<div className="mb-4">
						<CalendarSearchSortBar
							keyword={searchKeyword}
							sortBy={sortBy}
							onKeywordChange={setSearchKeyword}
							onSortChange={(newSortBy) =>
								setSortBy(newSortBy as CalendarSortBy)
							}
							showDirectionToggle={false}
							sortOptions={[
								{ value: "name", label: "Name A-Z" },
								{ value: "eventCount", label: "Event count" },
							]}
						/>
					</div>
				)}

				{/* Calendars grid */}
				{renderCalendarsGrid(
					calendarsArray,
					filteredCalendars,
					(id) => navigate({ to: `/calendars/${id}` }),
					handleEdit,
				)}

				{/* Edit dialog */}
				{group && (
					<CreateGroupDialog
						open={editDialogOpen}
						onOpenChange={setEditDialogOpen}
						groupToEdit={{
							id: group.id,
							name: group.name,
							description: group.description || null,
							color: group.color || null,
						}}
					/>
				)}

				{/* Share dialog */}
				{group && (
					<ShareCalendarsDialog
						calendarIds={calendarsArray.map((c) => c.id)}
						groupId={groupId}
						open={shareDialogOpen}
						onOpenChange={setShareDialogOpen}
					/>
				)}

				{/* Delete confirmation */}
				<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete group?</AlertDialogTitle>
							<AlertDialogDescription>
								This will delete the group "{group.name}". The calendars in this
								group will not be deleted, only the group itself.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => {
									deleteMutation.mutate({ id: groupId });
									setDeleteDialogOpen(false);
								}}
								className={cn(buttonVariants({ variant: "destructive" }))}
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
