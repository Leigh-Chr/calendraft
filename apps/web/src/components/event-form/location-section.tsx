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
		errors.geoLatitude = "La latitude doit être entre -90 et 90";
	}
	if (lon !== undefined && (lon < -180 || lon > 180)) {
		errors.geoLongitude = "La longitude doit être entre -180 et 180";
	}
	if (lat !== undefined && lon === undefined) {
		errors.geoLongitude = "La longitude est requise si la latitude est définie";
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
		errors.geoLongitude = "La longitude doit être entre -180 et 180";
	}
	if (lat !== undefined && (lat < -90 || lat > 90)) {
		errors.geoLatitude = "La latitude doit être entre -90 et 90";
	}
	if (lon !== undefined && lat === undefined) {
		errors.geoLatitude = "La latitude est requise si la longitude est définie";
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
				Coordonnées géographiques précises de l'événement. Utiles pour la
				navigation GPS et l'affichage sur une carte.
			</p>
			<div className="rounded-md bg-muted/50 p-3">
				<p className="mb-2 text-muted-foreground text-xs">
					<strong className="text-foreground">
						Comment obtenir les coordonnées :
					</strong>
				</p>
				<ul className="list-inside list-disc space-y-1 text-muted-foreground text-xs">
					<li>
						Sur Google Maps : cliquez droit sur l'emplacement → "Coordonnées"
					</li>
					<li>Sur OpenStreetMap : cliquez droit → "Afficher l'adresse"</li>
					<li>Exemple pour Paris : Latitude 48.8566, Longitude 2.3522</li>
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
									geoLatitude: "La latitude doit être un nombre valide",
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
							Position nord-sud. Entre -90 (pôle Sud) et 90 (pôle Nord). Pour la
							France, généralement entre 42 et 51.
							{formData.geoLatitude !== undefined &&
								formData.geoLongitude === undefined && (
									<span className="mt-1 block text-orange-600 dark:text-orange-400">
										⚠️ La longitude est également requise pour utiliser les
										coordonnées GPS.
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
									geoLongitude: "La longitude doit être un nombre valide",
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
							Position est-ouest. Entre -180 et 180. Pour la France,
							généralement entre -5 et 8.
							{formData.geoLongitude !== undefined &&
								formData.geoLatitude === undefined && (
									<span className="mt-1 block text-orange-600 dark:text-orange-400">
										⚠️ La latitude est également requise pour utiliser les
										coordonnées GPS.
									</span>
								)}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
