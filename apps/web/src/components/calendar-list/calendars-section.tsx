/**
 * Calendars section component
 * Displays the calendars grid or empty state
 */

import { Link, type useNavigate } from "@tanstack/react-router";
import { Calendar, FileUp, Plus } from "lucide-react";
import { StaggerContainer, StaggerItem } from "@/components/page-transition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TOUR_STEP_IDS } from "@/lib/tour-constants";
import { CalendarCard } from "./calendar-card";

interface CalendarsSectionProps {
	calendars: Array<{
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
	}>;
	navigate: ReturnType<typeof useNavigate>;
	dialogHandlers: {
		openEditDialog: (id: string, name: string, color?: string | null) => void;
		openDeleteDialog: (id: string, name: string) => void;
	};
	selectionHandlers: {
		selectionMode: boolean;
		selectedIds: Set<string>;
		handleToggleSelect: (id: string) => void;
	};
	isDeleting: boolean;
	isUpdating: boolean;
}

export function CalendarsSection({
	calendars,
	navigate,
	dialogHandlers,
	selectionHandlers,
	isDeleting,
	isUpdating,
}: CalendarsSectionProps) {
	return (
		<>
			<div className="mb-4 flex items-center justify-between">
				<h2 className="text-heading-2">Calendars</h2>
			</div>

			{calendars.length === 0 ? (
				<Card id={TOUR_STEP_IDS.CALENDAR_GRID}>
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
				<div id={TOUR_STEP_IDS.CALENDAR_GRID}>
					<StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{calendars.map((calendar) => (
							<StaggerItem key={calendar.id}>
								<CalendarCard
									calendar={calendar}
									onOpen={() => navigate({ to: `/calendars/${calendar.id}` })}
									onEdit={() =>
										dialogHandlers.openEditDialog(
											calendar.id,
											calendar.name,
											calendar.color,
										)
									}
									onDelete={() =>
										dialogHandlers.openDeleteDialog(calendar.id, calendar.name)
									}
									isDeleting={isDeleting}
									isUpdating={isUpdating}
									selectionMode={selectionHandlers.selectionMode}
									isSelected={selectionHandlers.selectedIds.has(calendar.id)}
									onToggleSelect={selectionHandlers.handleToggleSelect}
								/>
							</StaggerItem>
						))}
					</StaggerContainer>
				</div>
			)}
		</>
	);
}
