import {
	AlertCircle,
	AlignLeft,
	Calendar,
	FileText,
	MapPin,
} from "lucide-react";
import { DateTimePicker } from "@/components/date-time-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EventFormData } from "@/lib/event-form-types";
import { FIELD_LIMITS } from "@/lib/field-limits";

interface BasicInfoSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	validationErrors?: {
		title?: string;
		startDate?: string;
		endDate?: string;
	};
	onValidationErrorChange?: (errors: {
		title?: string;
		startDate?: string;
		endDate?: string;
	}) => void;
	isSubmitting: boolean;
}

/**
 * Date field component to reduce repetition
 */
function DateField({
	id,
	label,
	value,
	onChange,
	validationError,
	disabled,
	placeholder,
	ariaLabel,
	helpText,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	validationError?: string;
	disabled: boolean;
	placeholder: string;
	ariaLabel: string;
	helpText: string;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={id} className="flex items-center gap-2">
				<Calendar className="h-4 w-4 text-muted-foreground" />
				{label}
			</Label>
			<div
				className={
					validationError ? "rounded-md border border-destructive" : ""
				}
			>
				<DateTimePicker
					id={id}
					value={value}
					onChange={onChange}
					disabled={disabled}
					required
					aria-required="true"
					aria-invalid={validationError ? "true" : "false"}
					aria-describedby={validationError ? `${id}-error` : undefined}
					placeholder={placeholder}
					aria-label={ariaLabel}
				/>
			</div>
			{validationError && (
				<p
					id={`${id}-error`}
					className="flex items-center gap-1 text-destructive text-xs"
					role="alert"
				>
					<AlertCircle className="h-3 w-3" aria-hidden="true" />
					{validationError}
				</p>
			)}
			{!validationError && (
				<p className="text-muted-foreground text-xs">{helpText}</p>
			)}
		</div>
	);
}

/**
 * Section for basic event information (title, dates, location, description)
 */
export function BasicInfoSection({
	formData,
	onChange,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: BasicInfoSectionProps) {
	const handleTitleChange = (value: string) => {
		onChange({ title: value });
		if (onValidationErrorChange && validationErrors?.title) {
			onValidationErrorChange({ ...validationErrors, title: undefined });
		}
	};

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="title" className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-muted-foreground" />
					Titre *<span className="sr-only">requis</span>
				</Label>
				<Input
					id="title"
					value={formData.title}
					onChange={(e) => handleTitleChange(e.target.value)}
					required
					disabled={isSubmitting}
					aria-required="true"
					aria-invalid={validationErrors?.title ? "true" : "false"}
					aria-describedby={validationErrors?.title ? "title-error" : undefined}
					className={validationErrors?.title ? "border-destructive" : ""}
					maxLength={FIELD_LIMITS.TITLE}
					placeholder="Ex: Réunion d'équipe, Anniversaire, Rendez-vous médical..."
				/>
				{validationErrors?.title && (
					<p
						id="title-error"
						className="flex items-center gap-1 text-destructive text-xs"
						role="alert"
					>
						<AlertCircle className="h-3 w-3" aria-hidden="true" />
						{validationErrors.title}
					</p>
				)}
				{!validationErrors?.title && (
					<p className="text-muted-foreground text-xs">
						Nom de l'événement qui apparaîtra dans votre calendrier. Soyez
						concis et descriptif.
					</p>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<DateField
					id="startDate"
					label="Date de début *"
					value={formData.startDate}
					onChange={(value) => onChange({ startDate: value })}
					validationError={validationErrors?.startDate}
					disabled={isSubmitting}
					placeholder="Sélectionner la date et l'heure de début"
					ariaLabel="Date et heure de début de l'événement"
					helpText="Date et heure de début de l'événement. Cliquez pour ouvrir le calendrier."
				/>
				<DateField
					id="endDate"
					label="Date de fin *"
					value={formData.endDate}
					onChange={(value) => onChange({ endDate: value })}
					validationError={validationErrors?.endDate}
					disabled={isSubmitting}
					placeholder="Sélectionner la date et l'heure de fin"
					ariaLabel="Date et heure de fin de l'événement"
					helpText="Date et heure de fin de l'événement. Doit être après la date de début."
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="location" className="flex items-center gap-2">
					<MapPin className="h-4 w-4 text-muted-foreground" />
					Localisation
				</Label>
				<Input
					id="location"
					value={formData.location || ""}
					onChange={(e) => {
						const value = e.target.value;
						onChange({ location: value });
						// Show warning if approaching limit
						if (value.length > FIELD_LIMITS.LOCATION * 0.9) {
							// Could add a visual indicator here if needed
						}
					}}
					disabled={isSubmitting}
					maxLength={FIELD_LIMITS.LOCATION}
					placeholder="Ex: Salle de conférence A, 123 Rue Example..."
				/>
				<p className="text-muted-foreground text-xs">
					Adresse ou nom du lieu où se déroule l'événement. Vous pouvez ajouter
					des coordonnées précises dans la section "Localisation avancée".
					{formData.location &&
						formData.location.length > FIELD_LIMITS.LOCATION * 0.9 && (
							<span className="mt-1 block text-orange-600 dark:text-orange-400">
								⚠️ Limite de {FIELD_LIMITS.LOCATION} caractères approchée (
								{formData.location.length}/{FIELD_LIMITS.LOCATION})
							</span>
						)}
				</p>
			</div>

			<div className="space-y-2">
				<Label htmlFor="description" className="flex items-center gap-2">
					<AlignLeft className="h-4 w-4 text-muted-foreground" />
					Description
				</Label>
				<Textarea
					id="description"
					value={formData.description || ""}
					onChange={(e) => onChange({ description: e.target.value })}
					disabled={isSubmitting}
					rows={4}
					maxLength={FIELD_LIMITS.DESCRIPTION}
					placeholder="Décrivez votre événement, son objectif, l'ordre du jour..."
				/>
				<p className="text-muted-foreground text-xs">
					Informations détaillées sur l'événement. Cette description sera
					visible par tous les participants.
					{formData.description &&
						formData.description.length > FIELD_LIMITS.DESCRIPTION * 0.9 && (
							<span className="mt-1 block text-orange-600 dark:text-orange-400">
								⚠️ Limite de {FIELD_LIMITS.DESCRIPTION} caractères approchée (
								{formData.description.length}/{FIELD_LIMITS.DESCRIPTION})
							</span>
						)}
				</p>
			</div>
		</div>
	);
}
