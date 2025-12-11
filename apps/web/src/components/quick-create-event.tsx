/**
 * Quick Create Event - Quick modal to create an event
 * Displays on calendar slot click for simplified creation
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Calendar,
	ChevronRight,
	Clock,
	Loader2,
	MapPin,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { QUERY_KEYS } from "@/lib/query-keys";
import { trpc } from "@/utils/trpc";

interface QuickCreateEventProps {
	calendarId: string;
	startDate: Date;
	endDate: Date;
	onClose: () => void;
	onOpenFullForm: (data: { title: string; start: Date; end: Date }) => void;
	isOpen: boolean;
}

// Quick duration presets
const DURATION_PRESETS = [
	{ label: "30 min", minutes: 30 },
	{ label: "1h", minutes: 60 },
	{ label: "2h", minutes: 120 },
	{ label: "All day", allDay: true },
];

export function QuickCreateEvent({
	calendarId,
	startDate,
	endDate,
	onClose,
	onOpenFullForm,
	isOpen,
}: QuickCreateEventProps) {
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [showLocation, setShowLocation] = useState(false);
	const [currentEndDate, setCurrentEndDate] = useState(endDate);
	const inputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();

	// Reset state when opening
	useEffect(() => {
		if (isOpen) {
			setTitle("");
			setLocation("");
			setShowLocation(false);
			setCurrentEndDate(endDate);
			// Focus input after a small delay to ensure popover is mounted
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [isOpen, endDate]);

	const createMutation = useMutation(
		trpc.event.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: QUERY_KEYS.event.all });
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.calendar.byId(calendarId),
				});
				toast.success("Event created!");
				onClose();
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Error during creation";
				toast.error(message);
			},
		}),
	);

	// React Compiler will automatically memoize these callbacks
	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!title.trim()) {
			toast.error("Title is required");
			return;
		}

		createMutation.mutate({
			calendarId,
			title: title.trim(),
			startDate: startDate.toISOString(),
			endDate: currentEndDate.toISOString(),
			location: location.trim() || undefined,
		});
	};

	const handleDurationChange = (preset: (typeof DURATION_PRESETS)[number]) => {
		if (preset.allDay) {
			// Set to full day
			const newStart = new Date(startDate);
			newStart.setHours(0, 0, 0, 0);
			const newEnd = new Date(startDate);
			newEnd.setHours(23, 59, 59, 999);
			setCurrentEndDate(newEnd);
		} else if (preset.minutes) {
			const newEnd = new Date(startDate.getTime() + preset.minutes * 60000);
			setCurrentEndDate(newEnd);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		} else if (e.key === "Escape") {
			onClose();
		}
	};

	const handleMoreOptions = () => {
		onOpenFullForm({
			title: title.trim(),
			start: startDate,
			end: currentEndDate,
		});
		onClose();
	};

	// Format date display
	const formatDateRange = () => {
		const sameDay = startDate.toDateString() === currentEndDate.toDateString();
		if (sameDay) {
			return `${format(startDate, "EEEE d MMMM", { locale: enUS })}, ${format(startDate, "HH:mm")} - ${format(currentEndDate, "HH:mm")}`;
		}
		return `${format(startDate, "d MMM HH:mm", { locale: enUS })} - ${format(currentEndDate, "d MMM HH:mm", { locale: enUS })}`;
	};

	return (
		<Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<PopoverTrigger asChild>
				<span />
			</PopoverTrigger>
			<PopoverContent
				className="w-96 p-0 shadow-xl"
				side="right"
				align="start"
				sideOffset={8}
			>
				<form onSubmit={handleSubmit}>
					{/* Header */}
					<div className="flex items-center justify-between border-b p-3">
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Calendar className="h-4 w-4" />
							<span>New event</span>
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={onClose}
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* Content */}
					<div className="space-y-4 p-4">
						{/* Title Input */}
						<Input
							ref={inputRef}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Event title"
							className="border-0 p-0 font-medium text-lg placeholder:text-muted-foreground/60 focus-visible:ring-0"
							disabled={createMutation.isPending}
						/>

						{/* Date & Time */}
						<div className="flex items-center gap-2 text-sm">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground">{formatDateRange()}</span>
						</div>

						{/* Duration Presets */}
						<div className="flex flex-wrap gap-2">
							{DURATION_PRESETS.map((preset) => (
								<Button
									key={preset.label}
									type="button"
									variant="outline"
									size="sm"
									className="h-7 text-xs"
									onClick={() => handleDurationChange(preset)}
									disabled={createMutation.isPending}
								>
									{preset.label}
								</Button>
							))}
						</div>

						{/* Location (toggle) */}
						{showLocation ? (
							<div className="flex items-center gap-2">
								<MapPin className="h-4 w-4 text-muted-foreground" />
								<Input
									value={location}
									onChange={(e) => setLocation(e.target.value)}
									placeholder="Location"
									className="h-8 flex-1"
									disabled={createMutation.isPending}
									autoFocus
								/>
							</div>
						) : (
							<button
								type="button"
								onClick={() => setShowLocation(true)}
								className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground"
								disabled={createMutation.isPending}
							>
								<MapPin className="h-4 w-4" />
								<span>Add a location</span>
							</button>
						)}
					</div>

					{/* Footer */}
					<div className="flex items-center justify-between border-t bg-muted/30 p-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleMoreOptions}
							disabled={createMutation.isPending}
							className="text-muted-foreground"
						>
							More options
							<ChevronRight className="ml-1 h-4 w-4" />
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!title.trim() || createMutation.isPending}
						>
							{createMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create"
							)}
						</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}

/**
 * Hook to manage quick create state
 */
export function useQuickCreate() {
	const [state, setState] = useState<{
		isOpen: boolean;
		startDate: Date;
		endDate: Date;
	}>({
		isOpen: false,
		startDate: new Date(),
		endDate: new Date(),
	});

	// React Compiler will automatically memoize these callbacks
	const open = (startDate: Date, endDate: Date) => {
		setState({ isOpen: true, startDate, endDate });
	};

	const close = () => {
		setState((prev) => ({ ...prev, isOpen: false }));
	};

	return { ...state, open, close };
}
