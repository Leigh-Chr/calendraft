/**
 * Header component with action buttons for calendars list
 */

import { Link, type useNavigate } from "@tanstack/react-router";
import { CheckSquare, FileUp, Folder, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOUR_STEP_IDS } from "@/lib/tour-constants";

interface CalendarsListHeaderProps {
	calendars: Array<{
		id: string;
		name: string;
		eventCount: number;
	}>;
	navigate: ReturnType<typeof useNavigate>;
	groupHandlers: {
		handleCreateGroup: () => void;
	};
	selectionHandlers: {
		selectionMode: boolean;
		handleEnterSelectionMode: () => void;
	};
}

export function CalendarsListHeader({
	calendars,
	navigate,
	groupHandlers,
	selectionHandlers,
}: CalendarsListHeaderProps) {
	return (
		<div className="mb-6 flex flex-wrap items-center gap-4">
			<h1 className="text-heading-1">My calendars</h1>
			<div className="ml-auto flex flex-wrap items-center gap-2">
				{/* Primary action */}
				<Button
					id={TOUR_STEP_IDS.NEW_CALENDAR_BUTTON}
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
					onClick={groupHandlers.handleCreateGroup}
					disabled={calendars.length === 0}
				>
					<Folder className="mr-2 h-4 w-4" />
					New group
				</Button>
				<Button
					id={TOUR_STEP_IDS.IMPORT_BUTTON}
					variant="outline"
					size="sm"
					asChild
				>
					<Link to="/calendars/import">
						<FileUp className="mr-2 h-4 w-4" />
						Import
					</Link>
				</Button>
				{/* Selection mode toggle - pushed to the right when space allows */}
				{calendars.length > 0 && !selectionHandlers.selectionMode && (
					<Button
						variant="outline"
						size="sm"
						onClick={selectionHandlers.handleEnterSelectionMode}
					>
						<CheckSquare className="mr-2 h-4 w-4" />
						Select
					</Button>
				)}
			</div>
		</div>
	);
}
