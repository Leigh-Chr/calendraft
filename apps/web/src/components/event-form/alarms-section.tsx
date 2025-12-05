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
		return "The alert will trigger exactly at the event time.";
	}

	const unitLabels: Record<"minutes" | "hours" | "days", string> = {
		minutes: "minute",
		hours: "hour",
		days: "day",
	};

	const unitLabel = unitLabels[unit];
	const plural = value > 1 ? "s" : "";
	const direction = when === "before" ? "before" : "after";

	return `The alert will trigger ${value} ${unitLabel}${plural} ${direction} the start of the event.`;
}

interface AlarmCardProps {
	alarm: AlarmFormData;
	index: number;
	trigger: AlarmTrigger;
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void;
	onAlarmTriggerChange: (
		index: number,
		when: "before" | "at" | "after",
		value: number,
		unit: "minutes" | "hours" | "days",
	) => void;
	onRemoveAlarm: (index: number) => void;
	validationErrors?: AlarmValidationErrors;
	onValidationErrorChange?: (errors: AlarmValidationErrors) => void;
	isSubmitting: boolean;
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
				Alert duration (optional)
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
					aria-label="Duration value"
				/>
				<Select
					value={unit}
					onValueChange={handleUnitChange}
					disabled={disabled}
				>
					<SelectTrigger className="w-[140px]" aria-label="Duration unit">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="seconds">
							<div className="flex items-center gap-2">
								<Timer className="h-4 w-4" />
								<span>Seconds</span>
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
								<span>Hours</span>
							</div>
						</SelectItem>
						<SelectItem value="days">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>Days</span>
							</div>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<p className="text-muted-foreground text-xs">
				Duration for which the alert should remain active. Leave empty if you do
				not want to set a specific duration.
			</p>
		</div>
	);
}

// Sub-component: Alarm Action Select
function AlarmActionSelect({
	alarm,
	index,
	onAlarmChange,
	isSubmitting,
}: {
	alarm: AlarmFormData;
	index: number;
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void;
	isSubmitting: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={`alarm-action-${index}`}>Alert type</Label>
			<Select
				value={alarm.action}
				onValueChange={(value) =>
					handleAlarmActionChange(index, value, onAlarmChange)
				}
				disabled={isSubmitting}
			>
				<SelectTrigger
					id={`alarm-action-${index}`}
					aria-label={`Action type for alert ${index + 1}`}
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="DISPLAY">
						<div className="flex items-center gap-2">
							<Bell className="h-4 w-4" />
							<span>Display (on-screen notification)</span>
						</div>
					</SelectItem>
					<SelectItem value="EMAIL">
						<div className="flex items-center gap-2">
							<Mail className="h-4 w-4" />
							<span>Email (send an email)</span>
						</div>
					</SelectItem>
					<SelectItem value="AUDIO">
						<div className="flex items-center gap-2">
							<Volume2 className="h-4 w-4" />
							<span>Audio (sound or alarm)</span>
						</div>
					</SelectItem>
				</SelectContent>
			</Select>
			<p className="text-muted-foreground text-xs">
				Choose how you want to be alerted about this event.
			</p>
		</div>
	);
}

// Sub-component: Alarm Trigger Select
function AlarmTriggerSelect({
	index,
	trigger,
	onAlarmTriggerChange,
	isSubmitting,
}: {
	index: number;
	trigger: AlarmTrigger;
	onAlarmTriggerChange: AlarmCardProps["onAlarmTriggerChange"];
	isSubmitting: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={`alarm-trigger-when-${index}`}>
				When to trigger the alert
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
						aria-label={`When to trigger alert ${index + 1}`}
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="before">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								<span>Before</span>
							</div>
						</SelectItem>
						<SelectItem value="at">
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4" />
								<span>At time</span>
							</div>
						</SelectItem>
						<SelectItem value="after">
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4" />
								<span>After</span>
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
							onChange={(e) =>
								onAlarmTriggerChange(
									index,
									trigger.when,
									Number(e.target.value) || 1,
									trigger.unit,
								)
							}
							disabled={isSubmitting}
							className="w-full"
							aria-label={`Trigger value for alert ${index + 1}`}
							placeholder="15"
						/>
						<Select
							value={trigger.unit}
							onValueChange={(value: "minutes" | "hours" | "days") =>
								onAlarmTriggerChange(index, trigger.when, trigger.value, value)
							}
							disabled={isSubmitting}
						>
							<SelectTrigger
								aria-label={`Time unit for alert ${index + 1}`}
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
										<span>Hours</span>
									</div>
								</SelectItem>
								<SelectItem value="days">
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										<span>Days</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
					</>
				)}
			</div>
			<p className="text-muted-foreground text-xs">
				{getTriggerDescription(trigger.when, trigger.value, trigger.unit)}
			</p>
		</div>
	);
}

// Sub-component: Display Alarm Message
function DisplayAlarmMessage({
	alarm,
	index,
	onAlarmChange,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: {
	alarm: AlarmFormData;
	index: number;
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void;
	validationErrors?: AlarmValidationErrors;
	onValidationErrorChange?: (errors: AlarmValidationErrors) => void;
	isSubmitting: boolean;
}) {
	const error = validationErrors?.[index]?.summary;

	return (
		<div className="space-y-2">
			<Label htmlFor={`alarm-summary-${index}`}>Notification message</Label>
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
							`Message cannot exceed ${FIELD_LIMITS.ALARM_SUMMARY} characters`,
						);
						onValidationErrorChange(updatedErrors);
					}
				}}
				disabled={isSubmitting}
				className={error ? "border-destructive" : ""}
				aria-invalid={error ? "true" : "false"}
				aria-describedby={error ? `alarm-summary-${index}-error` : undefined}
				placeholder="Ex: Meeting in 15 minutes"
			/>
			{error ? (
				<p
					id={`alarm-summary-${index}-error`}
					className="flex items-center gap-1 text-destructive text-xs"
					role="alert"
				>
					<AlertCircle className="h-3 w-3" aria-hidden="true" />
					{error}
				</p>
			) : (
				<p className="text-muted-foreground text-xs">
					Text that will be displayed in the on-screen notification.
				</p>
			)}
		</div>
	);
}

// Sub-component: Email Alarm Message
function EmailAlarmMessage({
	alarm,
	index,
	onAlarmChange,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: {
	alarm: AlarmFormData;
	index: number;
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void;
	validationErrors?: AlarmValidationErrors;
	onValidationErrorChange?: (errors: AlarmValidationErrors) => void;
	isSubmitting: boolean;
}) {
	const error = validationErrors?.[index]?.description;

	return (
		<div className="space-y-2">
			<Label htmlFor={`alarm-description-${index}`}>Email message</Label>
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
							`Description cannot exceed ${FIELD_LIMITS.ALARM_DESCRIPTION} characters`,
						);
						onValidationErrorChange(updatedErrors);
					}
				}}
				disabled={isSubmitting}
				className={error ? "border-destructive" : ""}
				aria-invalid={error ? "true" : "false"}
				aria-describedby={
					error ? `alarm-description-${index}-error` : undefined
				}
				rows={2}
				placeholder="Ex: Don't forget your meeting at 2pm..."
			/>
			{error ? (
				<p
					id={`alarm-description-${index}-error`}
					className="flex items-center gap-1 text-destructive text-xs"
					role="alert"
				>
					<AlertCircle className="h-3 w-3" aria-hidden="true" />
					{error}
				</p>
			) : (
				<p className="text-muted-foreground text-xs">
					Email content that will be sent when the alarm is triggered.
				</p>
			)}
		</div>
	);
}

// Sub-component: Alarm Repeat Input
function AlarmRepeatInput({
	alarm,
	index,
	onAlarmChange,
	isSubmitting,
}: {
	alarm: AlarmFormData;
	index: number;
	onAlarmChange: (index: number, data: Partial<AlarmFormData>) => void;
	isSubmitting: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor={`alarm-repeat-${index}`}>
				Number of repetitions (optional)
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
					if (numValue === undefined || (numValue >= 0 && numValue <= 1000)) {
						onAlarmChange(index, { repeat: numValue });
					}
				}}
				disabled={isSubmitting}
				placeholder="0"
			/>
			<p className="text-muted-foreground text-xs">
				Number of times the alert should repeat (0-1000). 0 or empty = no
				repetition.
			</p>
		</div>
	);
}

// Main sub-component: Alarm Card
function AlarmCard({
	alarm,
	index,
	trigger,
	onAlarmChange,
	onAlarmTriggerChange,
	onRemoveAlarm,
	validationErrors,
	onValidationErrorChange,
	isSubmitting,
}: AlarmCardProps) {
	return (
		<Card className="border-muted p-4">
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h4 className="flex items-center gap-2 font-medium">
						<Bell className="h-4 w-4 text-muted-foreground" />
						Alert {index + 1}
					</h4>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onRemoveAlarm(index)}
						disabled={isSubmitting}
						aria-label={`Remove alert ${index + 1}`}
					>
						<X className="h-4 w-4" />
						Remove
					</Button>
				</div>
				<div className="space-y-4">
					<AlarmActionSelect
						alarm={alarm}
						index={index}
						onAlarmChange={onAlarmChange}
						isSubmitting={isSubmitting}
					/>
					<AlarmTriggerSelect
						index={index}
						trigger={trigger}
						onAlarmTriggerChange={onAlarmTriggerChange}
						isSubmitting={isSubmitting}
					/>
				</div>
				{alarm.action === "DISPLAY" && (
					<DisplayAlarmMessage
						alarm={alarm}
						index={index}
						onAlarmChange={onAlarmChange}
						validationErrors={validationErrors}
						onValidationErrorChange={onValidationErrorChange}
						isSubmitting={isSubmitting}
					/>
				)}
				{alarm.action === "EMAIL" && (
					<EmailAlarmMessage
						alarm={alarm}
						index={index}
						onAlarmChange={onAlarmChange}
						validationErrors={validationErrors}
						onValidationErrorChange={onValidationErrorChange}
						isSubmitting={isSubmitting}
					/>
				)}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<AlarmDurationInput
						index={index}
						duration={alarm.duration}
						onChange={(duration) => onAlarmChange(index, { duration })}
						disabled={isSubmitting}
					/>
					<AlarmRepeatInput
						alarm={alarm}
						index={index}
						onAlarmChange={onAlarmChange}
						isSubmitting={isSubmitting}
					/>
				</div>
			</div>
		</Card>
	);
}

// Empty state component
function EmptyAlarmsState() {
	return (
		<div className="flex items-start gap-3 rounded-md border border-muted bg-muted/50 p-4">
			<Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
			<p className="text-muted-foreground text-sm">
				No alerts configured. Click "Add an alert" below to receive reminders
				before or during the event.
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
	const defaultTrigger: AlarmTrigger = {
		when: "before",
		value: 15,
		unit: "minutes",
	};

	return (
		<div className="space-y-4">
			{(!alarms || alarms.length === 0) && <EmptyAlarmsState />}
			{alarms?.map((alarm, index) => (
				<AlarmCard
					key={`alarm-${alarm.trigger}-${alarm.action}-${index}`}
					alarm={alarm}
					index={index}
					trigger={alarmTriggers.get(index) || defaultTrigger}
					onAlarmChange={onAlarmChange}
					onAlarmTriggerChange={onAlarmTriggerChange}
					onRemoveAlarm={onRemoveAlarm}
					validationErrors={validationErrors}
					onValidationErrorChange={onValidationErrorChange}
					isSubmitting={isSubmitting}
				/>
			))}
			<Button
				type="button"
				variant="outline"
				onClick={onAddAlarm}
				disabled={isSubmitting}
			>
				<Bell className="h-4 w-4" />
				Add an alert
			</Button>
		</div>
	);
}
