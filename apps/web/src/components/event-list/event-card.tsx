/**
 * Event card component with smooth animations
 */

import { useNavigate } from "@tanstack/react-router";
import { Copy, Edit, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { EventBadges } from "./event-badges";
import { EventDetails } from "./event-details";
import type { EventItem } from "./types";

interface EventCardProps {
	event: EventItem;
	calendarId: string;
	onDelete: (id: string) => void;
	onDuplicate?: (id: string) => void;
	isDeleting: boolean;
	isDuplicating?: boolean;
}

export const EventCard = React.memo(function EventCard({
	event,
	calendarId,
	onDelete,
	onDuplicate,
	isDeleting,
	isDuplicating,
}: EventCardProps) {
	const navigate = useNavigate();

	const handleNavigate = useCallback(() => {
		navigate({ to: `/calendars/${calendarId}/events/${event.id}` });
	}, [navigate, calendarId, event.id]);

	const handleDelete = useCallback(() => {
		onDelete(event.id);
	}, [onDelete, event.id]);

	const handleDuplicate = useCallback(() => {
		onDuplicate?.(event.id);
	}, [onDuplicate, event.id]);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 20, scale: 0.95 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
			transition={{
				type: "spring",
				stiffness: 350,
				damping: 25,
			}}
		>
			<Card className="transition-shadow duration-200 hover:shadow-md">
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<EventBadges event={event} />
							<EventDetails event={event} />
						</div>
						<TooltipProvider>
							<div className="flex gap-2">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											onClick={handleNavigate}
										>
											<Edit className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Modifier</TooltipContent>
								</Tooltip>
								{onDuplicate && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="outline"
												size="icon"
												onClick={handleDuplicate}
												disabled={isDuplicating}
											>
												<Copy className="h-4 w-4" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Dupliquer</TooltipContent>
									</Tooltip>
								)}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="icon"
											onClick={handleDelete}
											disabled={isDeleting}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Supprimer</TooltipContent>
								</Tooltip>
							</div>
						</TooltipProvider>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
});
