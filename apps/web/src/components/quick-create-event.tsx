/**
 * Quick Create Event - Modal rapide pour créer un événement
 * S'affiche au clic sur un slot du calendrier pour une création simplifiée
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	Calendar,
	ChevronRight,
	Clock,
	Loader2,
	MapPin,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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

// Presets de durée rapides
const DURATION_PRESETS = [
	{ label: "30 min", minutes: 30 },
	{ label: "1h", minutes: 60 },
	{ label: "2h", minutes: 120 },
	{ label: "Journée", allDay: true },
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
				toast.success("Événement créé !");
				onClose();
			},
			onError: (error: unknown) => {
				const message =
					error instanceof Error ? error.message : "Erreur lors de la création";
				toast.error(message);
			},
		}),
	);

	const handleSubmit = useCallback(
		(e?: React.FormEvent) => {
			e?.preventDefault();
			if (!title.trim()) {
				toast.error("Le titre est requis");
				return;
			}

			createMutation.mutate({
				calendarId,
				title: title.trim(),
				startDate: startDate.toISOString(),
				endDate: currentEndDate.toISOString(),
				location: location.trim() || undefined,
			});
		},
		[title, location, calendarId, startDate, currentEndDate, createMutation],
	);

	const handleDurationChange = useCallback(
		(preset: (typeof DURATION_PRESETS)[number]) => {
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
		},
		[startDate],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			} else if (e.key === "Escape") {
				onClose();
			}
		},
		[handleSubmit, onClose],
	);

	const handleMoreOptions = useCallback(() => {
		onOpenFullForm({
			title: title.trim(),
			start: startDate,
			end: currentEndDate,
		});
		onClose();
	}, [title, startDate, currentEndDate, onOpenFullForm, onClose]);

	// Format date display
	const formatDateRange = () => {
		const sameDay = startDate.toDateString() === currentEndDate.toDateString();
		if (sameDay) {
			return `${format(startDate, "EEEE d MMMM", { locale: fr })}, ${format(startDate, "HH:mm")} - ${format(currentEndDate, "HH:mm")}`;
		}
		return `${format(startDate, "d MMM HH:mm", { locale: fr })} - ${format(currentEndDate, "d MMM HH:mm", { locale: fr })}`;
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
							<span>Nouvel événement</span>
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
							placeholder="Titre de l'événement"
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
									placeholder="Lieu"
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
								<span>Ajouter un lieu</span>
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
							Plus d'options
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
									Création...
								</>
							) : (
								"Créer"
							)}
						</Button>
					</div>
				</form>
			</PopoverContent>
		</Popover>
	);
}

/**
 * Hook pour gérer l'état du quick create
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

	const open = useCallback((startDate: Date, endDate: Date) => {
		setState({ isOpen: true, startDate, endDate });
	}, []);

	const close = useCallback(() => {
		setState((prev) => ({ ...prev, isOpen: false }));
	}, []);

	return { ...state, open, close };
}
