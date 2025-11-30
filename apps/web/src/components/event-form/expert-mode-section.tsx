import { AlertCircle, HelpCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateTimePicker } from "@/components/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EventFormData } from "@/lib/event-form-types";
import { validateUID } from "@/lib/event-form-validation-zod";
import { formatDateToICS, parseDateFromICS } from "@/lib/ics-date-helper";

interface ExpertModeSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	calendarId?: string;
	currentEventId?: string;
	isSubmitting: boolean;
	relatedToEventList?: React.ReactNode;
	validationErrors?: {
		uid?: string;
		recurrenceId?: string;
		relatedTo?: string;
	};
	onValidationErrorChange?: (errors: {
		uid?: string;
		recurrenceId?: string;
		relatedTo?: string;
	}) => void;
}

/**
 * Section for expert mode (advanced ICS properties)
 */
export function ExpertModeSection({
	formData,
	onChange,
	calendarId,
	currentEventId: _currentEventId,
	isSubmitting,
	relatedToEventList,
	validationErrors,
	onValidationErrorChange,
}: ExpertModeSectionProps) {
	const handleUIDChange = (value: string) => {
		onChange({ uid: value });
		if (onValidationErrorChange) {
			const error = validateUID(value);
			onValidationErrorChange({
				...validationErrors,
				uid: error,
			});
		}
	};

	// Parse RECURRENCE-ID from ICS format (UTC) to display in DateTimePicker (local)
	const recurrenceIdDate = parseDateFromICS(formData.recurrenceId);
	const getDateTimeString = useCallback((date: Date | null): string => {
		if (!date) return "";
		// Convert UTC date to local for display
		const localDate = new Date(
			date.getUTCFullYear(),
			date.getUTCMonth(),
			date.getUTCDate(),
			date.getUTCHours(),
			date.getUTCMinutes(),
		);
		const year = localDate.getFullYear();
		const month = String(localDate.getMonth() + 1).padStart(2, "0");
		const day = String(localDate.getDate()).padStart(2, "0");
		const hours = String(localDate.getHours()).padStart(2, "0");
		const minutes = String(localDate.getMinutes()).padStart(2, "0");
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}, []);

	const [recurrenceIdDateTime, setRecurrenceIdDateTime] = useState<string>(
		getDateTimeString(recurrenceIdDate),
	);

	// Update when formData.recurrenceId changes externally
	useEffect(() => {
		const parsed = parseDateFromICS(formData.recurrenceId);
		setRecurrenceIdDateTime(getDateTimeString(parsed));
	}, [formData.recurrenceId, getDateTimeString]);

	const handleRecurrenceIdDateTimeChange = (value: string) => {
		setRecurrenceIdDateTime(value);
		if (value) {
			// Parse local datetime and convert to UTC for ICS format
			const localDate = new Date(value);
			// Convert to ICS format (UTC)
			const icsDate = formatDateToICS(localDate);
			onChange({ recurrenceId: icsDate });
			// Clear any validation errors
			if (onValidationErrorChange) {
				onValidationErrorChange({
					...validationErrors,
					recurrenceId: undefined,
				});
			}
		} else {
			onChange({ recurrenceId: undefined });
		}
	};
	return (
		<div className="space-y-4">
			<div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
				<p className="mb-1 font-medium text-amber-800 text-xs dark:text-amber-200">
					⚠️ Mode Expert : Champs pour import/export ICS
				</p>
				<p className="text-amber-700 text-xs dark:text-amber-300">
					Ces champs sont principalement utiles lors de l'import/export de
					fichiers ICS. Ils sont gérés automatiquement lors de la création
					normale d'événements. Modifiez uniquement si vous importez des
					événements depuis un autre calendrier.
				</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label htmlFor="uid">UID (Identifiant unique)</Label>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Identifiant unique technique de l'événement au format ICS.
										Généré automatiquement à la création.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<Input
						id="uid"
						value={formData.uid || ""}
						onChange={(e) => handleUIDChange(e.target.value)}
						disabled={isSubmitting || !!formData.uid}
						placeholder="Auto-généré si vide"
						readOnly={!!formData.uid}
						className={
							formData.uid
								? "bg-muted"
								: validationErrors?.uid
									? "border-destructive"
									: ""
						}
						aria-invalid={validationErrors?.uid ? "true" : "false"}
						aria-describedby={validationErrors?.uid ? "uid-error" : undefined}
					/>
					{validationErrors?.uid && (
						<p
							id="uid-error"
							className="flex items-center gap-1 text-destructive text-xs"
							role="alert"
						>
							<AlertCircle className="h-3 w-3" aria-hidden="true" />
							{validationErrors.uid}
						</p>
					)}
					<p className="text-muted-foreground text-xs">
						{formData.uid
							? "Identifiant unique préservé depuis l'import (lecture seule). Modifier ce champ peut casser la synchronisation."
							: "Identifiant unique auto-généré. Ne modifiez que lors de l'import d'un événement depuis un fichier ICS pour préserver son identifiant original."}
					</p>
				</div>

				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label htmlFor="recurrenceId">
							Date de l'occurrence modifiée (RECURRENCE-ID)
						</Label>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Date et heure de l'occurrence spécifique qui a été modifiée
										dans une série récurrente. Généré automatiquement lors de la
										modification d'une occurrence.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<DateTimePicker
						id="recurrenceId"
						value={recurrenceIdDateTime}
						onChange={handleRecurrenceIdDateTimeChange}
						disabled={isSubmitting}
						placeholder="Sélectionner la date et l'heure de l'occurrence"
						aria-label="Date et heure de l'occurrence modifiée"
					/>
					{validationErrors?.recurrenceId && (
						<p
							id="recurrenceId-error"
							className="flex items-center gap-1 text-destructive text-xs"
							role="alert"
						>
							<AlertCircle className="h-3 w-3" aria-hidden="true" />
							{validationErrors.recurrenceId}
						</p>
					)}
					<p className="text-muted-foreground text-xs">
						Généré automatiquement lors de la modification d'une occurrence
						récurrente. Ne modifiez que lors de l'import d'un événement avec
						exception depuis un autre calendrier.
					</p>
				</div>

				{/* RELATED-TO : Très rarement utilisé, masqué par défaut mais disponible si nécessaire */}
				{formData.relatedTo && (
					<div className="space-y-2">
						<Label htmlFor="relatedTo">Événement lié (RELATED-TO)</Label>
						{calendarId ? (
							<>
								<Select
									value={formData.relatedTo || "none"}
									onValueChange={(value) =>
										onChange({
											relatedTo: value === "none" ? undefined : value,
										})
									}
									disabled={isSubmitting}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sélectionner un événement" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Aucun</SelectItem>
										{relatedToEventList}
									</SelectContent>
								</Select>
								<p className="text-muted-foreground text-xs">
									Propriété très rarement utilisée. Permet de lier cet événement
									à un autre événement du calendrier.
								</p>
							</>
						) : (
							<Input
								id="relatedTo"
								value={formData.relatedTo || ""}
								onChange={(e) => onChange({ relatedTo: e.target.value })}
								disabled={isSubmitting}
								placeholder="UID d'un événement lié"
							/>
						)}
					</div>
				)}

				<div className="space-y-2">
					<div className="flex items-center gap-2">
						<Label htmlFor="sequence">Séquence (SEQUENCE)</Label>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<HelpCircle className="h-4 w-4 cursor-help text-muted-foreground" />
								</TooltipTrigger>
								<TooltipContent>
									<p>
										Numéro de séquence incrémenté automatiquement lors des mises
										à jour. Utile pour la synchronisation entre calendriers.
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					<Input
						id="sequence"
						type="number"
						min="0"
						value={formData.sequence ?? 0}
						onChange={(e) => onChange({ sequence: Number(e.target.value) })}
						disabled={isSubmitting}
						readOnly
						className="bg-muted"
					/>
					<p className="text-muted-foreground text-xs">
						Numéro de séquence pour la synchronisation (lecture seule, géré
						automatiquement).
					</p>
				</div>
			</div>
		</div>
	);
}
