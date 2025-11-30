/**
 * Event card component
 */

import { useNavigate } from "@tanstack/react-router";
import { Edit, Trash2 } from "lucide-react";
import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventBadges } from "./event-badges";
import { EventDetails } from "./event-details";
import type { EventItem } from "./types";

interface EventCardProps {
	event: EventItem;
	calendarId: string;
	onDelete: (id: string) => void;
	isDeleting: boolean;
}

export const EventCard = React.memo(function EventCard({
	event,
	calendarId,
	onDelete,
	isDeleting,
}: EventCardProps) {
	const navigate = useNavigate();

	const handleNavigate = useCallback(() => {
		navigate({ to: `/calendars/${calendarId}/events/${event.id}` });
	}, [navigate, calendarId, event.id]);

	const handleDelete = useCallback(() => {
		onDelete(event.id);
	}, [onDelete, event.id]);

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<EventBadges event={event} />
						<EventDetails event={event} />
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="icon" onClick={handleNavigate}>
							<Edit className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
});
