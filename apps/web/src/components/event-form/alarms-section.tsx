import {
	AlertCircle,
	Bell,
	Calendar,
	Clock,
	Mail,
	Timer,
	Volume2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AlarmTrigger } from "@/hooks/use-alarm-triggers";
import type { AlarmFormData } from "@/lib/event-form-types";
import { FIELD_LIMITS } from "@/lib/field-limits";
import {
	formatDurationToICS,
	parseDurationFromICS,
} from "@/lib/ics-duration-helper";

type AlarmValidationErrors = Record<
	number,
	{
		summary?: string;
		description?: string;
		trigger?: string;
	}
>;

/**
 * Update validation errors for alarm field
 */
function updateAlarmValidationError(
	errors: AlarmValidationErrors,
	index: number,
	field: "summary" | "description",
	value: string,
	maxLength: number,
	errorMessage: string,
): AlarmValidationErrors {
	const newErrors = { ...errors };
	if (!newErrors[index]) {
		newErrors[index] = {};
	}

	if (value.length > maxLength) {
		newErrors[index][field] = errorMessage;
	} else {
		newErrors[index][field] = undefined;
	}

	// Clean up empty error objects
	if (Object.keys(newErrors[index]).length === 0) {
		delete newErrors[index];
	}

	return Object.keys(newErrors).length > 0 ? newErrors : {};
}

/**
 * Handle alarm action change with field clearing logic
 */
function handleAlarmActionChange(
	index: number,
	value: string,
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void,
) {
	if (value === "DISPLAY") {
		onAlarmChange(index, { action: value, description: undefined });
	} else if (value === "EMAIL") {
		onAlarmChange(index, { action: value, summary: undefined });
	} else {
		// AUDIO - clear both
		onAlarmChange(index, {
			action: value,
			summary: undefined,
			description: undefined,
		});
	}
}

/**
 * Handle alarm trigger when change
 */
function handleTriggerWhenChange(
	index: number,
	value: "before" | "at" | "after",
	currentWhen: "before" | "at" | "after",
	currentValue: number,
	currentUnit: "minutes" | "hours" | "days",
	onAlarmTriggerChange: (
		index: number,
		when: "before" | "at" | "after",
		value: number,
		unit: "minutes" | "hours" | "days",
	) => void,
) {
	if (value === "at") {
		onAlarmTriggerChange(index, value, 0, "minutes");
	} else if (currentWhen === "at") {
		// Switching from "at" to "before/after", use default
		onAlarmTriggerChange(index, value, 15, "minutes");
	} else {
		// Keep existing values when switching between "before" and "after"
		onAlarmTriggerChange(index, value, currentValue, currentUnit);
	}
}

/**
 * Get trigger description text
 */
function getTriggerDescription(
	when: "before" | "at" | "after",
	value: number,
	unit: "minutes" | "hours" | "days",
): string {
	if (when === "at") {
		return "L'alerte se déclenchera exactement au moment de l'événement.";
	}

	const unitLabels: Record<"minutes" | "hours" | "days", string> = {
		minutes: "minute",
		hours: "heure",
		days: "jour",
	};

	const unitLabel = unitLabels[unit];
	const plural = value > 1 ? "s" : "";
	const direction = when === "before" ? "avant" : "après";

	return `L'alerte se déclenchera ${value} ${unitLabel}${plural} ${direction} le début de l'événement.`;
}

interface AlarmsSectionProps {
	alarms: AlarmFormData[] | undefined;
	alarmTriggers: Map<number, AlarmTrigger>;
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void;
	onAlarmTriggerChange: (
		index: number,
		when: "before" | "at" | "after",
		value: number,
		unit: "minutes" | "hours" | "days",
	) => void;
	onAddAlarm: () => void;
	onRemoveAlarm: (index: number) => void;
	validationErrors?: AlarmValidationErrors;
	onValidationErrorChange?: (errors: AlarmValidationErrors) => void;
	isSubmitting: boolean;
}

/**
 * Component for alarm duration input with automatic ICS formatting
 */
function AlarmDurationInput({
	index,
	duration,
	onChange,
	disabled,
}: {
	index: number;
	duration?: string;
	onChange: (duration: string) => void;
	disabled?: boolean;
}) {
	// Parse existing ICS duration to display simple values
	const parsed = parseDurationFromICS(duration);
	const [value, setValue] = useState<string>(parsed?.value.toString() || "");
	const [unit, setUnit] = useState<"minutes" | "hours" | "days" | "seconds">(
		parsed?.unit || "minutes",
	);

	// Update when duration prop changes (e.g., from external source)
	useEffect(() => {
		const newParsed = parseDurationFromICS(duration);
		if (newParsed) {
			setValue(newParsed.value.toString());
			setUnit(newParsed.unit);
		} else if (!duration) {
			setValue("");
		}
	}, [duration]);

	// Convert simple input to ICS format
	const handleValueChange = (newValue: string) => {
		setValue(newValue);
		const numValue = Number.parseInt(newValue, 10);
		if (newValue === "" || Number.isNaN(numValue) || numValue <= 0) {
			onChange("");
		} else {
			onChange(formatDurationToICS(numValue, unit));
		}
	};

	const handleUnitChange = (
		newUnit: "minutes" | "hours" | "days" | "seconds",
	) => {
		setUnit(newUnit);
		const numValue = Number.parseInt(value, 10);
		if (value && !Number.isNaN(numValue) && numValue > 0) {
			onChange(formatDurationToICS(numValue, newUnit));
		}
	};

	return (
		<div className="space-y-2">
			<Label htmlFor={`alarm-duration-${index}`}>
				Durée de l'alerte (optionnel)
			</Label>
			<div className="flex gap-2">
				<Input
					id={`alarm-duration-${index}`}
					type="number"
					min="1"
					value={value}
					onChange={(e) => handleValueChange(e.target.value)}
					disabled={disabled}
					placeholder="5"
					className="flex-1"
					aria-label="Valeur de la durée"
				/>
				<Select
					value={unit}
					onValueChange={handleUnitChange}
					disabled={disabled}
				>
					<SelectTrigger className="w-[140px]" aria-label="Unité de durée">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="seconds">
							<div className="flex items-center gap-2">
								<Timer className="h-4 w-4" />
								<span>Secondes</span>
							</div>
						</SelectItem>
						<SelectItem value="minutes">
							<div className="flex items-center gap-2">
								<Timer className="h-4 w-4" />
								<span>Minutes</span>
							</div>
						</SelectItem>
						<SelectItem value="hours">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								<span>Heures</span>
							</div>
						</SelectItem>
						<SelectItem value="days">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>Jours</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<p className="text-muted-foreground text-xs">
				Durée pendant laquelle l'alerte doit rester active. Laissez vide si vous
				ne souhaitez pas définir de durée spécifique.
			</p>
		</div>
	);
}

/**
 * Section for event alarms and notifications
 */
export function AlarmsSection({
	alarms,
	alarmTriggers,
	onAlarmChange,
	onAlarmTriggerChange,
	onAddAlarm,
	onRemoveAlarm,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: AlarmsSectionProps) {
	return (
		<div className="space-y-4">
			{(!alarms || alarms.length === 0) && (
				<div className="flex items-start gap-3 rounded-md border border-muted bg-muted/50 p-4">
					<Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
					<p className="text-muted-foreground text-sm">
						Aucune alerte configurée. Cliquez sur "Ajouter une alerte"
						ci-dessous pour recevoir des rappels avant ou pendant l'événement.
					</p>
				</div>
			)}
			{alarms?.map((alarm, index) => {
				const trigger = alarmTriggers.get(index) || {
					when: "before" as const,
					value: 15,
					unit: "minutes" as const,
				};
				return (
					<Card
						key={`alarm-${alarm.trigger}-${alarm.action}-${index}`}
						className="border-muted p-4"
					>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<h4 className="flex items-center gap-2 font-medium">
									<Bell className="h-4 w-4 text-muted-foreground" />
									Alerte {index + 1}
								</h4>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => onRemoveAlarm(index)}
									disabled={isSubmitting}
									aria-label={`Supprimer l'alerte ${index + 1}`}
								>
									<X className="h-4 w-4" />
									Supprimer
								</Button>
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor={`alarm-action-${index}`}>Type d'alerte</Label>
									<Select
										value={alarm.action}
										onValueChange={(value) => {
											handleAlarmActionChange(index, value, onAlarmChange);
										}}
										disabled={isSubmitting}
									>
										<SelectTrigger
											id={`alarm-action-${index}`}
											aria-label={`Type d'action pour l'alerte ${index + 1}`}
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DISPLAY">
												<div className="flex items-center gap-2">
													<Bell className="h-4 w-4" />
													<span>Affichage (notification à l'écran)</span>
												</div>
											</SelectItem>
											<SelectItem value="EMAIL">
												<div className="flex items-center gap-2">
													<Mail className="h-4 w-4" />
													<span>Email (envoi d'un email)</span>
												</div>
											</SelectItem>
											<SelectItem value="AUDIO">
												<div className="flex items-center gap-2">
													<Volume2 className="h-4 w-4" />
													<span>Audio (son ou alarme)</span>
												</div>
											</SelectItem>
										</SelectContent>
									</Select>
									<p className="text-muted-foreground text-xs">
										Choisissez comment vous souhaitez être alerté de cet
										événement.
									</p>
								</div>
								<div className="space-y-2">
									<Label htmlFor={`alarm-trigger-when-${index}`}>
										Quand déclencher l'alerte
									</Label>
									<div className="grid grid-cols-3 gap-2">
										<Select
											value={trigger.when}
											onValueChange={(value: "before" | "at" | "after") => {
												handleTriggerWhenChange(
													index,
													value,
													trigger.when,
													trigger.value,
													trigger.unit,
													onAlarmTriggerChange,
												);
											}}
											disabled={isSubmitting}
										>
											<SelectTrigger
												id={`alarm-trigger-when-${index}`}
												aria-label={`Quand déclencher l'alerte ${index + 1}`}
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="before">
													<div className="flex items-center gap-2">
														<Clock className="h-4 w-4" />
														<span>Avant</span>
													</div>
												</SelectItem>
												<SelectItem value="at">
													<div className="flex items-center gap-2">
														<Calendar className="h-4 w-4" />
														<span>À l'heure</span>
													</div>
												</SelectItem>
												<SelectItem value="after">
													<div className="flex items-center gap-2">
														<Clock className="h-4 w-4" />
														<span>Après</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
										{trigger.when !== "at" && (
											<>
												<Input
													id={`alarm-trigger-value-${index}`}
													type="number"
													min="1"
													value={trigger.value}
													onChange={(e) => {
														onAlarmTriggerChange(
															index,
															trigger.when,
															Number(e.target.value) || 1,
															trigger.unit,
														);
													}}
													disabled={isSubmitting}
													className="w-full"
													aria-label={`Valeur du déclencheur pour l'alerte ${index + 1}`}
													placeholder="15"
												/>
												<Select
													value={trigger.unit}
													onValueChange={(
														value: "minutes" | "hours" | "days",
													) => {
														onAlarmTriggerChange(
															index,
															trigger.when,
															trigger.value,
															value,
														);
													}}
													disabled={isSubmitting}
												>
													<SelectTrigger
														aria-label={`Unité de temps pour l'alerte ${index + 1}`}
														className="w-full"
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="minutes">
															<div className="flex items-center gap-2">
																<Timer className="h-4 w-4" />
																<span>Minutes</span>
															</div>
														</SelectItem>
														<SelectItem value="hours">
															<div className="flex items-center gap-2">
																<Clock className="h-4 w-4" />
																<span>Heures</span>
															</div>
														</SelectItem>
														<SelectItem value="days">
															<div className="flex items-center gap-2">
																<Calendar className="h-4 w-4" />
																<span>Jours</span>
															</div>
														</SelectItem>
													</SelectContent>
												</Select>
											</>
										)}
									</div>
									<p className="text-muted-foreground text-xs">
										{getTriggerDescription(
											trigger.when,
											trigger.value,
											trigger.unit,
										)}
									</p>
								</div>
							</div>
							{alarm.action === "DISPLAY" && (
								<div className="space-y-2">
									<Label htmlFor={`alarm-summary-${index}`}>
										Message de notification
									</Label>
									<Input
										id={`alarm-summary-${index}`}
										value={alarm.summary || ""}
										maxLength={FIELD_LIMITS.ALARM_SUMMARY}
										onChange={(e) => {
											const value = e.target.value;
											onAlarmChange(index, { summary: value });
											if (onValidationErrorChange && validationErrors) {
												const updatedErrors = updateAlarmValidationError(
													validationErrors,
													index,
													"summary",
													value,
													FIELD_LIMITS.ALARM_SUMMARY,
													`Le message ne peut pas dépasser ${FIELD_LIMITS.ALARM_SUMMARY} caractères`,
												);
												onValidationErrorChange(updatedErrors);
											}
										}}
										disabled={isSubmitting}
										className={
											validationErrors?.[index]?.summary
												? "border-destructive"
												: ""
										}
										aria-invalid={
											validationErrors?.[index]?.summary ? "true" : "false"
										}
										aria-describedby={
											validationErrors?.[index]?.summary
												? `alarm-summary-${index}-error`
												: undefined
										}
										placeholder="Ex: Réunion dans 15 minutes"
									/>
									{validationErrors?.[index]?.summary && (
										<p
											id={`alarm-summary-${index}-error`}
											className="flex items-center gap-1 text-destructive text-xs"
											role="alert"
										>
											<AlertCircle className="h-3 w-3" aria-hidden="true" />
											{validationErrors[index].summary}
										</p>
									)}
									{!validationErrors?.[index]?.summary && (
										<p className="text-muted-foreground text-xs">
											Texte qui s'affichera dans la notification à l'écran.
										</p>
									)}
								</div>
							)}
							{alarm.action === "EMAIL" && (
								<div className="space-y-2">
									<Label htmlFor={`alarm-description-${index}`}>
										Message de l'email
									</Label>
									<Textarea
										id={`alarm-description-${index}`}
										value={alarm.description || ""}
										maxLength={FIELD_LIMITS.ALARM_DESCRIPTION}
										onChange={(e) => {
											const value = e.target.value;
											onAlarmChange(index, { description: value });
											if (onValidationErrorChange && validationErrors) {
												const updatedErrors = updateAlarmValidationError(
													validationErrors,
													index,
													"description",
													value,
													FIELD_LIMITS.ALARM_DESCRIPTION,
													`La description ne peut pas dépasser ${FIELD_LIMITS.ALARM_DESCRIPTION} caractères`,
												);
												onValidationErrorChange(updatedErrors);
											}
										}}
										disabled={isSubmitting}
										className={
											validationErrors?.[index]?.description
												? "border-destructive"
												: ""
										}
										aria-invalid={
											validationErrors?.[index]?.description ? "true" : "false"
										}
										aria-describedby={
											validationErrors?.[index]?.description
												? `alarm-description-${index}-error`
												: undefined
										}
										rows={2}
										placeholder="Ex: N'oubliez pas votre réunion à 14h..."
									/>
									{validationErrors?.[index]?.description && (
										<p
											id={`alarm-description-${index}-error`}
											className="flex items-center gap-1 text-destructive text-xs"
											role="alert"
										>
											<AlertCircle className="h-3 w-3" aria-hidden="true" />
											{validationErrors[index].description}
										</p>
									)}
									{!validationErrors?.[index]?.description && (
										<p className="text-muted-foreground text-xs">
											Contenu de l'email qui sera envoyé lors du déclenchement
											de l'alerte.
										</p>
									)}
								</div>
							)}
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<AlarmDurationInput
									index={index}
									duration={alarm.duration}
									onChange={(duration) => onAlarmChange(index, { duration })}
									disabled={isSubmitting}
								/>
								<div className="space-y-2">
									<Label htmlFor={`alarm-repeat-${index}`}>
										Nombre de répétitions (optionnel)
									</Label>
									<Input
										id={`alarm-repeat-${index}`}
										type="number"
										min="0"
										max="1000"
										value={alarm.repeat ?? ""}
										onChange={(e) => {
											const value = e.target.value;
											const numValue = value ? Number(value) : undefined;
											// Validate range - allow update but browser will enforce min/max
											if (
												numValue === undefined ||
												(numValue >= 0 && numValue <= 1000)
											) {
												onAlarmChange(index, { repeat: numValue });
											}
										}}
										disabled={isSubmitting}
										placeholder="0"
									/>
									<p className="text-muted-foreground text-xs">
										Nombre de fois que l'alerte doit se répéter (0-1000). 0 ou
										vide = pas de répétition.
									</p>
								</div>
							</div>
						</div>
					</Card>
				);
			})}
			<Button
				type="button"
				variant="outline"
				onClick={onAddAlarm}
				disabled={isSubmitting}
			>
				<Bell className="h-4 w-4" />
				Ajouter une alerte
			</Button>
		</div>
	);
}
