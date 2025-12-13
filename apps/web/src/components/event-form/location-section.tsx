import { AlertCircle, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventFormData } from "@/lib/event-form-types";

type GeoValidationErrors = {
	geoLatitude?: string;
	geoLongitude?: string;
};

interface LocationSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	validationErrors?: GeoValidationErrors;
	onValidationErrorChange?: (errors: GeoValidationErrors) => void;
	isSubmitting: boolean;
}

/**
 * Validate latitude value
 */
function validateLatitude(
	lat: number,
	lon: number | undefined,
): GeoValidationErrors {
	const errors: GeoValidationErrors = {};
	if (lat < -90 || lat > 90) {
		errors.geoLatitude = "Latitude must be between -90 and 90";
	}
	if (lon !== undefined && (lon < -180 || lon > 180)) {
		errors.geoLongitude = "Longitude must be between -180 and 180";
	}
	if (lat !== undefined && lon === undefined) {
		errors.geoLongitude = "Longitude is required if latitude is defined";
	}
	return errors;
}

/**
 * Validate longitude value
 */
function validateLongitude(
	lon: number,
	lat: number | undefined,
): GeoValidationErrors {
	const errors: GeoValidationErrors = {};
	if (lon < -180 || lon > 180) {
		errors.geoLongitude = "Longitude must be between -180 and 180";
	}
	if (lat !== undefined && (lat < -90 || lat > 90)) {
		errors.geoLatitude = "Latitude must be between -90 and 90";
	}
	if (lon !== undefined && lat === undefined) {
		errors.geoLatitude = "Latitude is required if longitude is defined";
	}
	return errors;
}

/**
 * Handle clearing coordinate value
 */
function handleClearCoordinate(
	coordinate: "latitude" | "longitude",
	formData: EventFormData,
	onChange: (data: Partial<EventFormData>) => void,
	onValidationErrorChange?: (errors: GeoValidationErrors) => void,
	validationErrors?: GeoValidationErrors,
) {
	if (coordinate === "latitude") {
		if (formData.geoLongitude !== undefined) {
			onChange({ geoLatitude: undefined, geoLongitude: undefined });
			onValidationErrorChange?.({
				geoLatitude: undefined,
				geoLongitude: undefined,
			});
		} else {
			onChange({ geoLatitude: undefined });
			onValidationErrorChange?.({
				...validationErrors,
				geoLatitude: undefined,
			});
		}
	} else {
		if (formData.geoLatitude !== undefined) {
			onChange({ geoLatitude: undefined, geoLongitude: undefined });
			onValidationErrorChange?.({
				geoLatitude: undefined,
				geoLongitude: undefined,
			});
		} else {
			onChange({ geoLongitude: undefined });
			onValidationErrorChange?.({
				...validationErrors,
				geoLongitude: undefined,
			});
		}
	}
}

/**
 * Section for advanced location (geographic coordinates)
 */
export function LocationSection({
	formData,
	onChange,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: LocationSectionProps) {
	return (
		<div className="space-y-4">
			<p className="text-muted-foreground text-sm">
				Precise geographic coordinates of the event. Useful for GPS navigation
				and map display.
			</p>
			<div className="rounded-md bg-muted/50 p-3">
				<p className="mb-2 text-muted-foreground text-xs">
					<strong className="text-foreground">How to get coordinates:</strong>
				</p>
				<ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
					<li>On Google Maps: right-click on the location → "Coordinates"</li>
					<li>On OpenStreetMap: right-click → "Show address"</li>
					<li>Example for Paris: Latitude 48.8566, Longitude 2.3522</li>
				</ul>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="geoLatitude" className="flex items-center gap-2">
						<Navigation className="h-4 w-4 text-muted-foreground" />
						Latitude
					</Label>
					<Input
						id="geoLatitude"
						type="number"
						inputMode="decimal"
						step="0.000001"
						min="-90"
						max="90"
						value={formData.geoLatitude ?? ""}
						onChange={(e) => {
							const value = e.target.value;
							if (!value || value.trim() === "") {
								handleClearCoordinate(
									"latitude",
									formData,
									onChange,
									onValidationErrorChange,
									validationErrors,
								);
								return;
							}

							const newLat = Number(value);
							if (Number.isNaN(newLat)) {
								onValidationErrorChange?.({
									...validationErrors,
									geoLatitude: "Latitude must be a valid number",
								});
								return;
							}

							onChange({ geoLatitude: newLat });

							if (onValidationErrorChange) {
								const errors = validateLatitude(newLat, formData.geoLongitude);
								onValidationErrorChange({
									...validationErrors,
									...errors,
								});
							}
						}}
						disabled={isSubmitting}
						className={
							validationErrors?.geoLatitude ? "border-destructive" : ""
						}
						aria-invalid={validationErrors?.geoLatitude ? "true" : "false"}
						aria-describedby={
							validationErrors?.geoLatitude ? "geoLatitude-error" : undefined
						}
						placeholder="Ex: 48.8566"
					/>
					{validationErrors?.geoLatitude && (
						<p
							id="geoLatitude-error"
							className="flex items-center gap-1 text-destructive text-xs"
							role="alert"
						>
							<AlertCircle className="h-3 w-3" aria-hidden="true" />
							{validationErrors.geoLatitude}
						</p>
					)}
					{!validationErrors?.geoLatitude && (
						<p className="text-muted-foreground text-xs">
							North-south position. Between -90 (South Pole) and 90 (North
							Pole). For France, generally between 42 and 51.
							{formData.geoLatitude !== undefined &&
								formData.geoLongitude === undefined && (
									<span className="mt-1 block text-orange-600 dark:text-orange-400">
										⚠️ Longitude is also required to use GPS coordinates.
									</span>
								)}
						</p>
					)}
				</div>
				<div className="space-y-2">
					<Label htmlFor="geoLongitude" className="flex items-center gap-2">
						<Navigation className="h-4 w-4 text-muted-foreground" />
						Longitude
					</Label>
					<Input
						id="geoLongitude"
						type="number"
						inputMode="decimal"
						step="0.000001"
						min="-180"
						max="180"
						value={formData.geoLongitude ?? ""}
						onChange={(e) => {
							const value = e.target.value;
							if (!value || value.trim() === "") {
								handleClearCoordinate(
									"longitude",
									formData,
									onChange,
									onValidationErrorChange,
									validationErrors,
								);
								return;
							}

							const newLon = Number(value);
							if (Number.isNaN(newLon)) {
								onValidationErrorChange?.({
									...validationErrors,
									geoLongitude: "Longitude must be a valid number",
								});
								return;
							}

							onChange({ geoLongitude: newLon });

							if (onValidationErrorChange) {
								const errors = validateLongitude(newLon, formData.geoLatitude);
								onValidationErrorChange({
									...validationErrors,
									...errors,
								});
							}
						}}
						disabled={isSubmitting}
						className={
							validationErrors?.geoLongitude ? "border-destructive" : ""
						}
						aria-invalid={validationErrors?.geoLongitude ? "true" : "false"}
						aria-describedby={
							validationErrors?.geoLongitude ? "geoLongitude-error" : undefined
						}
						placeholder="Ex: 2.3522"
					/>
					{validationErrors?.geoLongitude && (
						<p
							id="geoLongitude-error"
							className="flex items-center gap-1 text-destructive text-xs"
							role="alert"
						>
							<AlertCircle className="h-3 w-3" aria-hidden="true" />
							{validationErrors.geoLongitude}
						</p>
					)}
					{!validationErrors?.geoLongitude && (
						<p className="text-muted-foreground text-xs">
							East-west position. Between -180 and 180. For France, generally
							between -5 and 8.
							{formData.geoLongitude !== undefined &&
								formData.geoLatitude === undefined && (
									<span className="mt-1 block text-orange-600 dark:text-orange-400">
										⚠️ Latitude is also required to use GPS coordinates.
									</span>
								)}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
