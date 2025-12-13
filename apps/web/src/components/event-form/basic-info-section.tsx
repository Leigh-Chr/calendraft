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
					Title *<span className="sr-only">required</span>
				</Label>
				<Input
					id="title"
					value={formData.title}
					onChange={(e) => handleTitleChange(e.target.value)}
					required
					disabled={isSubmitting}
					enterKeyHint="next"
					aria-required="true"
					aria-invalid={validationErrors?.title ? "true" : "false"}
					aria-describedby={validationErrors?.title ? "title-error" : undefined}
					className={validationErrors?.title ? "border-destructive" : ""}
					maxLength={FIELD_LIMITS.TITLE}
					placeholder="Ex: Team meeting, Birthday, Medical appointment..."
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
						Event name that will appear in your calendar. Be concise and
						descriptive.
					</p>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<DateField
					id="startDate"
					label="Start date *"
					value={formData.startDate}
					onChange={(value) => onChange({ startDate: value })}
					validationError={validationErrors?.startDate}
					disabled={isSubmitting}
					placeholder="Select start date and time"
					ariaLabel="Event start date and time"
					helpText="Event start date and time. Click to open the calendar."
				/>
				<DateField
					id="endDate"
					label="End date *"
					value={formData.endDate}
					onChange={(value) => onChange({ endDate: value })}
					validationError={validationErrors?.endDate}
					disabled={isSubmitting}
					placeholder="Select end date and time"
					ariaLabel="Event end date and time"
					helpText="Event end date and time. Must be after the start date."
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="location" className="flex items-center gap-2">
					<MapPin className="h-4 w-4 text-muted-foreground" />
					Location
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
					autoComplete="street-address"
					enterKeyHint="next"
					maxLength={FIELD_LIMITS.LOCATION}
					placeholder="Ex: Conference Room A, 123 Example Street..."
				/>
				<p className="text-muted-foreground text-xs">
					Address or name of the place where the event takes place. You can add
					precise coordinates in the "Advanced location" section.
					{formData.location &&
						formData.location.length > FIELD_LIMITS.LOCATION * 0.9 && (
							<span className="mt-1 block text-orange-600 dark:text-orange-400">
								⚠️ {FIELD_LIMITS.LOCATION} character limit approaching (
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
					enterKeyHint="done"
					rows={4}
					maxLength={FIELD_LIMITS.DESCRIPTION}
					placeholder="Describe your event, its purpose, the agenda..."
				/>
				<p className="text-muted-foreground text-xs">
					Detailed information about the event. This description will be visible
					to all attendees.
					{formData.description &&
						formData.description.length > FIELD_LIMITS.DESCRIPTION * 0.9 && (
							<span className="mt-1 block text-orange-600 dark:text-orange-400">
								⚠️ {FIELD_LIMITS.DESCRIPTION} character limit approaching (
								{formData.description.length}/{FIELD_LIMITS.DESCRIPTION})
							</span>
						)}
				</p>
			</div>
		</div>
	);
}
