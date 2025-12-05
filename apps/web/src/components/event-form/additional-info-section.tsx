import { AlertCircle, Link2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import type { EventFormData } from "@/lib/event-form-types";
import { FIELD_LIMITS } from "@/lib/field-limits";
import { validateURL } from "@/lib/validation";

interface AdditionalInfoSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	validationErrors: { url?: string };
	onValidationErrorChange: (errors: { url?: string }) => void;
	isSubmitting: boolean;
}

/**
 * Section for additional event information (URL, resources)
 */
export function AdditionalInfoSection({
	formData,
	onChange,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: AdditionalInfoSectionProps) {
	const handleUrlChange = (value: string) => {
		onChange({ url: value });
		// Clear error on change
		if (validationErrors.url) {
			onValidationErrorChange({ url: undefined });
		}
		// Real-time validation
		if (value) {
			const error = validateURL(value);
			if (error) {
				onValidationErrorChange({ url: error });
			}
		}
	};

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="url" className="flex items-center gap-2">
					<Link2 className="h-4 w-4 text-muted-foreground" />
					URL (web link)
				</Label>
				<Input
					id="url"
					type="url"
					value={formData.url || ""}
					onChange={(e) => handleUrlChange(e.target.value)}
					disabled={isSubmitting}
					maxLength={FIELD_LIMITS.URL}
					placeholder="https://example.com"
					className={validationErrors.url ? "border-destructive" : ""}
					aria-invalid={validationErrors.url ? "true" : "false"}
					aria-describedby={validationErrors.url ? "url-error" : undefined}
				/>
				{validationErrors.url ? (
					<p
						className="flex items-center gap-1 text-destructive text-xs"
						role="alert"
					>
						<AlertCircle className="h-3 w-3" />
						{validationErrors.url}
					</p>
				) : (
					<p className="text-muted-foreground text-xs">
						Link to a web page related to the event (website, shared document,
						video conference, etc.).
						<span className="mt-1 block">
							Must start with http:// or https://
						</span>
					</p>
				)}
			</div>

			<div className="space-y-2">
				<div className="flex items-center gap-2">
					<Package className="h-4 w-4 text-muted-foreground" />
					<Label htmlFor="resources">Required resources</Label>
				</div>
				<TagInput
					id="resources"
					label=""
					value={formData.resources}
					onChange={(value) => onChange({ resources: value })}
					disabled={isSubmitting}
					placeholder="Ex: Projector, Conference room, Microphone..."
					helpText="List the material resources or locations needed for this event"
					maxTagLength={FIELD_LIMITS.TAG}
					maxTotalLength={500}
				/>
			</div>
		</div>
	);
}
