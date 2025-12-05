/**
 * Event card component with smooth animations
 * Supports selection mode for bulk operations
 */

import { useNavigate } from "@tanstack/react-router";
import { Copy, Edit, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
	/** Selection mode props */
	selectionMode?: boolean;
	isSelected?: boolean;
	onToggleSelect?: (id: string) => void;
}

export const EventCard = React.memo(function EventCard({
	event,
	calendarId,
	onDelete,
	onDuplicate,
	isDeleting,
	isDuplicating,
	selectionMode = false,
	isSelected = false,
	onToggleSelect,
}: EventCardProps) {
	const navigate = useNavigate();

	const handleNavigate = useCallback(() => {
		if (selectionMode) {
			onToggleSelect?.(event.id);
		} else {
			navigate({ to: `/calendars/${calendarId}/events/${event.id}` });
		}
	}, [navigate, calendarId, event.id, selectionMode, onToggleSelect]);

	const handleDelete = useCallback(() => {
		onDelete(event.id);
	}, [onDelete, event.id]);

	const handleDuplicate = useCallback(() => {
		onDuplicate?.(event.id);
	}, [onDuplicate, event.id]);

	const handleCheckboxChange = useCallback(
		(_checked: boolean) => {
			onToggleSelect?.(event.id);
		},
		[onToggleSelect, event.id],
	);

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
			<Card
				className={cn(
					"transition-all duration-200 hover:shadow-md",
					selectionMode && "cursor-pointer",
					isSelected && "bg-primary/5 ring-2 ring-primary",
				)}
				onClick={selectionMode ? handleNavigate : undefined}
			>
				<CardContent className="p-4">
					<div className="flex items-start gap-3">
						{/* Selection checkbox */}
						{selectionMode && (
							<div className="flex items-center pt-0.5">
								<Checkbox
									checked={isSelected}
									onCheckedChange={handleCheckboxChange}
									onClick={(e) => e.stopPropagation()}
									aria-label={`Select ${event.title}`}
								/>
							</div>
						)}

						<div className="flex-1">
							<EventBadges event={event} />
							<EventDetails event={event} />
						</div>

						{/* Action buttons - hide in selection mode */}
						{!selectionMode && (
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
										<TooltipContent>Edit</TooltipContent>
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
											<TooltipContent>Duplicate</TooltipContent>
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
										<TooltipContent>Delete</TooltipContent>
									</Tooltip>
								</div>
							</TooltipProvider>
						)}
					</div>
				</CardContent>
			</Card>
		</motion.div>
	);
});
