import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { enUS } from "date-fns/locale";
import { AlertCircle, CalendarIcon, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface RecurrenceConfig {
	frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;
	interval: number;
	endType: "never" | "count" | "until";
	count?: number;
	until?: Date;
	byDay?: string[]; // For WEEKLY: ['MO', 'WE', 'FR']
	byMonthDay?: number; // For MONTHLY: 1-31
	byMonth?: number[]; // For YEARLY: [1, 6, 12]
}

interface RecurrenceBuilderProps {
	rrule: string;
	onChange: (rrule: string) => void;
	disabled?: boolean;
	startDate?: Date; // For preview
}

// Presets for quick selection
const RECURRENCE_PRESETS = [
	{ label: "Daily", rrule: "FREQ=DAILY", icon: "📅" },
	{ label: "Weekly", rrule: "FREQ=WEEKLY", icon: "📆" },
	{ label: "Monthly", rrule: "FREQ=MONTHLY", icon: "🗓️" },
	{
		label: "Weekdays",
		rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
		icon: "💼",
	},
	{ label: "Yearly", rrule: "FREQ=YEARLY", icon: "🎂" },
] as const;

// Day code to number mapping
const DAY_CODE_MAP: Record<string, number> = {
	SU: 0,
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6,
};

// Check if date should be included based on BYDAY config
function shouldIncludeDate(
	date: Date,
	frequency: string,
	byDay: string[] | undefined,
): boolean {
	if (frequency !== "WEEKLY" || !byDay?.length) return true;

	const dayOfWeek = date.getDay();
	const currentDayCode = Object.entries(DAY_CODE_MAP).find(
		([, num]) => num === dayOfWeek,
	)?.[0];

	return byDay.includes(currentDayCode || "");
}

// Check if recurrence end condition is met
function isEndConditionMet(
	config: RecurrenceConfig,
	dateCount: number,
	currentDate: Date,
): boolean {
	if (config.endType === "count" && config.count && dateCount >= config.count) {
		return true;
	}
	if (
		config.endType === "until" &&
		config.until &&
		currentDate > config.until
	) {
		return true;
	}
	return false;
}

// Get next date based on frequency
function getNextDate(
	currentDate: Date,
	frequency: string,
	interval: number,
	byDay: string[] | undefined,
	shouldInclude: boolean,
): Date {
	switch (frequency) {
		case "DAILY":
			return addDays(currentDate, shouldInclude ? interval : 1);
		case "WEEKLY":
			return byDay?.length
				? addDays(currentDate, 1)
				: addWeeks(currentDate, interval);
		case "MONTHLY":
			return addMonths(currentDate, interval);
		case "YEARLY":
			return addYears(currentDate, interval);
		default:
			return addDays(currentDate, 1);
	}
}

// Calculate next occurrences for preview
function getNextOccurrences(
	config: RecurrenceConfig,
	startDate: Date,
	count: number,
): Date[] {
	if (!config.frequency) return [];

	const dates: Date[] = [];
	let currentDate = new Date(startDate);
	const interval = config.interval || 1;
	const maxIterations = 100;

	for (let i = 0; i < maxIterations && dates.length < count; i++) {
		const shouldInclude = shouldIncludeDate(
			currentDate,
			config.frequency,
			config.byDay,
		);

		if (isEndConditionMet(config, dates.length, currentDate)) break;

		if (shouldInclude && currentDate >= startDate) {
			dates.push(new Date(currentDate));
		}

		currentDate = getNextDate(
			currentDate,
			config.frequency,
			interval,
			config.byDay,
			shouldInclude,
		);
	}

	return dates.slice(0, count);
}

// Format date to ICS format (YYYYMMDDTHHmmssZ)
function formatIcsDate(date: Date): string {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const seconds = String(date.getUTCSeconds()).padStart(2, "0");
	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// Parse ICS date format (YYYYMMDDTHHmmssZ)
function parseIcsDate(dateStr: string): Date {
	const year = Number.parseInt(dateStr.substring(0, 4), 10);
	const month = Number.parseInt(dateStr.substring(4, 6), 10) - 1;
	const day = Number.parseInt(dateStr.substring(6, 8), 10);
	const hours = Number.parseInt(dateStr.substring(9, 11), 10);
	const minutes = Number.parseInt(dateStr.substring(11, 13), 10);
	const seconds = Number.parseInt(dateStr.substring(13, 15), 10);
	return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

// Parse RRULE string to RecurrenceConfig
function parseRRULE(rrule: string): RecurrenceConfig | null {
	if (!rrule || !rrule.trim()) return null;

	const config: Partial<RecurrenceConfig> = {
		interval: 1,
		endType: "never",
	};

	const parts = rrule.split(";");
	for (const part of parts) {
		const [key, value] = part.split("=");
		if (!key || !value) continue;

		switch (key) {
			case "FREQ":
				if (["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(value)) {
					config.frequency = value as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
				}
				break;
			case "INTERVAL":
				config.interval = Number.parseInt(value, 10) || 1;
				break;
			case "COUNT":
				config.endType = "count";
				config.count = Number.parseInt(value, 10);
				break;
			case "UNTIL":
				config.endType = "until";
				try {
					config.until = parseIcsDate(value);
				} catch {
					// If parsing fails, try regular date
					config.until = new Date(value);
				}
				break;
			case "BYDAY":
				config.byDay = value.split(",");
				break;
			case "BYMONTHDAY":
				config.byMonthDay = Number.parseInt(value, 10);
				break;
			case "BYMONTH":
				config.byMonth = value.split(",").map((m) => Number.parseInt(m, 10));
				break;
		}
	}

	return config as RecurrenceConfig;
}

// Generate RRULE string from RecurrenceConfig
function generateRRULE(config: RecurrenceConfig): string {
	if (!config.frequency) return "";

	const parts: string[] = [];
	parts.push(`FREQ=${config.frequency}`);

	if (config.interval > 1) {
		parts.push(`INTERVAL=${config.interval}`);
	}

	if (config.endType === "count" && config.count) {
		parts.push(`COUNT=${config.count}`);
	} else if (config.endType === "until" && config.until) {
		parts.push(`UNTIL=${formatIcsDate(config.until)}`);
	}

	if (config.frequency === "WEEKLY" && config.byDay?.length) {
		parts.push(`BYDAY=${config.byDay.join(",")}`);
	}

	if (config.frequency === "MONTHLY" && config.byMonthDay) {
		parts.push(`BYMONTHDAY=${config.byMonthDay}`);
	}

	if (config.frequency === "YEARLY" && config.byMonth?.length) {
		parts.push(`BYMONTH=${config.byMonth.join(",")}`);
	}

	return parts.join(";");
}

const DAYS_OF_WEEK = [
	{ value: "MO", label: "Monday" },
	{ value: "TU", label: "Tuesday" },
	{ value: "WE", label: "Wednesday" },
	{ value: "TH", label: "Thursday" },
	{ value: "FR", label: "Friday" },
	{ value: "SA", label: "Saturday" },
	{ value: "SU", label: "Sunday" },
];

const MONTHS = [
	{ value: 1, label: "January" },
	{ value: 2, label: "February" },
	{ value: 3, label: "March" },
	{ value: 4, label: "April" },
	{ value: 5, label: "May" },
	{ value: 6, label: "June" },
	{ value: 7, label: "July" },
	{ value: 8, label: "August" },
	{ value: 9, label: "September" },
	{ value: 10, label: "October" },
	{ value: 11, label: "November" },
	{ value: 12, label: "December" },
];

// Supported RRULE keys that can be represented in the simple UI
const SUPPORTED_RRULE_KEYS = [
	"FREQ",
	"INTERVAL",
	"COUNT",
	"UNTIL",
	"BYDAY",
	"BYMONTHDAY",
	"BYMONTH",
] as const;

// Get interval label prefix
function getIntervalPrefix(frequency: string | null): string {
	return frequency === "WEEKLY" ? "Every" : "Every";
}

// Get interval unit label
function getIntervalUnit(frequency: string | null, interval: number): string {
	const units: Record<string, string> = {
		DAILY: `day${interval > 1 ? "s" : ""}`,
		WEEKLY: `week${interval > 1 ? "s" : ""}`,
		MONTHLY: `month${interval > 1 ? "s" : ""}`,
		YEARLY: `year${interval > 1 ? "s" : ""}`,
	};
	return frequency ? units[frequency] || "" : "";
}

// Get interval description
function getIntervalDescription(
	frequency: string | null,
	interval: number,
): string {
	const descriptions: Record<string, string> = {
		DAILY: `The event will repeat every ${interval} day${interval > 1 ? "s" : ""}.`,
		WEEKLY: `The event will repeat every ${interval} week${interval > 1 ? "s" : ""}.`,
		MONTHLY: `The event will repeat every ${interval} month${interval > 1 ? "s" : ""}.`,
		YEARLY: `The event will repeat every ${interval} year${interval > 1 ? "s" : ""}.`,
	};
	return frequency ? descriptions[frequency] || "" : "";
}

// Check if the current rrule can be fully represented in the simple UI
function canFullyRepresent(rrule: string): boolean {
	if (!rrule || !rrule.trim()) return true;
	const parsed = parseRRULE(rrule);
	if (!parsed) return false;

	const parts = rrule.split(";");
	return parts.every((part) => {
		const [key] = part.split("=");
		return (
			!key ||
			SUPPORTED_RRULE_KEYS.includes(
				key as (typeof SUPPORTED_RRULE_KEYS)[number],
			)
		);
	});
}

// Sub-component: Quick Presets Section
function QuickPresetsSection({
	onPresetClick,
	disabled,
}: {
	onPresetClick: (preset: (typeof RECURRENCE_PRESETS)[number]) => void;
	disabled: boolean;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Sparkles className="h-4 w-4" />
				<span>Quick recurrences</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{RECURRENCE_PRESETS.map((preset) => (
					<Button
						key={preset.label}
						type="button"
						variant="outline"
						size="sm"
						onClick={() => onPresetClick(preset)}
						disabled={disabled}
						className="h-8"
					>
						<span className="mr-1.5">{preset.icon}</span>
						{preset.label}
					</Button>
				))}
			</div>
		</div>
	);
}

// Sub-component: Complex Rule Warning
function ComplexRuleWarning({
	onRemove,
	disabled,
}: {
	onRemove: () => void;
	disabled: boolean;
}) {
	return (
		<div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
			<div className="flex items-start gap-2">
				<AlertCircle className="mt-0.5 h-4 w-4 text-orange-600 dark:text-orange-400" />
				<div className="flex-1">
					<p className="font-medium text-orange-800 text-sm dark:text-orange-200">
						Complex recurrence rule detected
					</p>
					<p className="mt-1 text-orange-700 text-xs dark:text-orange-300">
						This recurrence rule contains advanced parameters that cannot be
						modified via the simple interface. To modify it, you will need to
						delete it and create a new one.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onRemove}
						disabled={disabled}
						className="mt-2"
					>
						Remove this rule
					</Button>
				</div>
			</div>
		</div>
	);
}

// Get byDay description
function getByDayDescription(byDay: string[] | undefined): string {
	if (!byDay || byDay.length === 0) {
		return "Select at least one day. If no day is selected, the event will repeat on the weekday of the start date.";
	}
	const dayLabels = byDay.map(
		(d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label,
	);
	return `The event will repeat every ${dayLabels.join(", ")}.`;
}

// Get end type description
function getEndTypeDescription(
	endType: RecurrenceConfig["endType"],
	count: number | undefined,
	until: Date | undefined,
): string {
	if (endType === "never") {
		return "The event will repeat indefinitely.";
	}
	if (endType === "count" && count) {
		return `The event will repeat ${count} times in total.`;
	}
	if (endType === "until" && until) {
		return `The event will repeat until ${format(until, "PPP", { locale: enUS })}.`;
	}
	if (endType === "until" && !until) {
		return "Select an end date for the recurrence.";
	}
	return "";
}

// Sub-component: Interval Input
function IntervalInput({
	config,
	onUpdate,
	disabled,
}: {
	config: RecurrenceConfig;
	onUpdate: (updates: Partial<RecurrenceConfig>) => void;
	disabled: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor="recurrence-interval">Repeat</Label>
			<div className="flex items-center gap-2">
				<span className="whitespace-nowrap text-muted-foreground text-sm">
					{getIntervalPrefix(config.frequency)}
				</span>
				<Input
					id="recurrence-interval"
					type="number"
					min="1"
					value={config.interval}
					onChange={(e) =>
						onUpdate({
							interval: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
						})
					}
					disabled={disabled}
					className="w-20"
				/>
				<span className="whitespace-nowrap text-muted-foreground text-sm">
					{getIntervalUnit(config.frequency, config.interval)}
				</span>
			</div>
			<p className="text-muted-foreground text-xs">
				{getIntervalDescription(config.frequency, config.interval)}
			</p>
		</div>
	);
}

// Sub-component: Weekly Days Selector
function WeeklyDaysSelector({
	byDay,
	onToggle,
	disabled,
}: {
	byDay: string[] | undefined;
	onToggle: (day: string) => void;
	disabled: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label>Which days of the week?</Label>
			<div className="grid grid-cols-2 gap-2">
				{DAYS_OF_WEEK.map((day) => (
					<div key={day.value} className="flex items-center space-x-2">
						<Checkbox
							id={`day-${day.value}`}
							checked={byDay?.includes(day.value) || false}
							onCheckedChange={() => onToggle(day.value)}
							disabled={disabled}
						/>
						<Label
							htmlFor={`day-${day.value}`}
							className="cursor-pointer font-normal text-sm"
						>
							{day.label}
						</Label>
					</div>
				))}
			</div>
			<p className="text-muted-foreground text-xs">
				{getByDayDescription(byDay)}
			</p>
		</div>
	);
}

// Sub-component: Monthly Day Selector
function MonthlyDaySelector({
	byMonthDay,
	onUpdate,
	disabled,
}: {
	byMonthDay: number | undefined;
	onUpdate: (updates: Partial<RecurrenceConfig>) => void;
	disabled: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label htmlFor="recurrence-month-day">Which day of the month?</Label>
			<Select
				value={byMonthDay?.toString() || "none"}
				onValueChange={(value) =>
					onUpdate({
						byMonthDay:
							value === "none" ? undefined : Number.parseInt(value, 10),
					})
				}
				disabled={disabled}
			>
				<SelectTrigger id="recurrence-month-day">
					<SelectValue placeholder="Select a day" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">Same day as start date</SelectItem>
					{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
						<SelectItem key={day} value={day.toString()}>
							Day {day}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p className="text-muted-foreground text-xs">
				{byMonthDay
					? `The event will repeat on the ${byMonthDay} of each month.`
					: "The event will repeat on the same day of the month as the start date."}
			</p>
		</div>
	);
}

// Sub-component: Yearly Months Selector
function YearlyMonthsSelector({
	byMonth,
	onToggle,
	disabled,
}: {
	byMonth: number[] | undefined;
	onToggle: (month: number) => void;
	disabled: boolean;
}) {
	const monthLabels = byMonth
		?.map((m) => MONTHS.find((month) => month.value === m)?.label)
		.join(", ");

	return (
		<div className="space-y-2">
			<Label>Which months?</Label>
			<div className="grid grid-cols-3 gap-2">
				{MONTHS.map((month) => (
					<div key={month.value} className="flex items-center space-x-2">
						<Checkbox
							id={`month-${month.value}`}
							checked={byMonth?.includes(month.value) || false}
							onCheckedChange={() => onToggle(month.value)}
							disabled={disabled}
						/>
						<Label
							htmlFor={`month-${month.value}`}
							className="cursor-pointer font-normal text-sm"
						>
							{month.label}
						</Label>
					</div>
				))}
			</div>
			<p className="text-muted-foreground text-xs">
				{byMonth && byMonth.length > 0
					? `The event will repeat in ${monthLabels}.`
					: "Select at least one month. If no month is selected, the event will repeat in the same month as the start date."}
			</p>
		</div>
	);
}

// Sub-component: End Type Selector
function EndTypeSelector({
	config,
	onUpdate,
	disabled,
}: {
	config: RecurrenceConfig;
	onUpdate: (updates: Partial<RecurrenceConfig>) => void;
	disabled: boolean;
}) {
	return (
		<div className="space-y-2">
			<Label>When does the recurrence end?</Label>
			<RadioGroup
				value={config.endType}
				onValueChange={(value: "never" | "count" | "until") =>
					onUpdate({ endType: value, count: undefined, until: undefined })
				}
				disabled={disabled}
			>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="never" id="end-never" />
					<Label htmlFor="end-never" className="cursor-pointer font-normal">
						Never (infinite repetition)
					</Label>
				</div>
				<div className="flex flex-wrap items-center gap-2 space-x-2">
					<RadioGroupItem value="count" id="end-count" />
					<Label htmlFor="end-count" className="cursor-pointer font-normal">
						After
					</Label>
					{config.endType === "count" && (
						<>
							<Input
								type="number"
								min="1"
								value={config.count || ""}
								onChange={(e) =>
									onUpdate({
										count: Number.parseInt(e.target.value, 10) || undefined,
									})
								}
								disabled={disabled}
								className="w-20"
								placeholder="10"
							/>
							<span className="text-muted-foreground text-sm">occurrences</span>
						</>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2 space-x-2">
					<RadioGroupItem value="until" id="end-until" />
					<Label htmlFor="end-until" className="cursor-pointer font-normal">
						Until
					</Label>
					{config.endType === "until" && (
						<Popover>
							<PopoverTrigger asChild>
								<Button type="button" variant="outline" disabled={disabled}>
									<CalendarIcon className="mr-2 h-4 w-4" />
									{config.until
										? format(config.until, "PPP", { locale: enUS })
										: "Select a date"}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={config.until}
									onSelect={(date) => onUpdate({ until: date })}
									disabled={disabled}
									initialFocus
								/>
							</PopoverContent>
						</Popover>
					)}
				</div>
			</RadioGroup>
			<p className="text-muted-foreground text-xs">
				{getEndTypeDescription(config.endType, config.count, config.until)}
			</p>
		</div>
	);
}

// Sub-component: Occurrences Preview
function OccurrencesPreview({
	occurrences,
	showInfiniteHint,
}: {
	occurrences: Date[];
	showInfiniteHint: boolean;
}) {
	if (occurrences.length === 0) return null;

	return (
		<div className="rounded-lg border bg-muted/30 p-4">
			<p className="mb-3 flex items-center gap-2 font-medium text-sm">
				<CalendarIcon className="h-4 w-4 text-primary" />
				Next occurrences
			</p>
			<div className="flex flex-wrap gap-2">
				{occurrences.map((date, index) => (
					<Badge
						key={date.toISOString()}
						variant="secondary"
						className={cn(
							"text-xs",
							index === 0 && "bg-primary/10 text-primary",
						)}
					>
						{format(date, "EEE d MMM", { locale: enUS })}
					</Badge>
				))}
			</div>
			{showInfiniteHint && (
				<p className="mt-2 text-muted-foreground text-xs">And so on...</p>
			)}
		</div>
	);
}

export function RecurrenceBuilder({
	rrule,
	onChange,
	disabled = false,
	startDate: startDateProp,
}: RecurrenceBuilderProps) {
	const [config, setConfig] = useState<RecurrenceConfig>(() => {
		const parsed = parseRRULE(rrule);
		return (
			parsed || {
				frequency: null,
				interval: 1,
				endType: "never",
			}
		);
	});

	// Use provided start date or default to now
	const startDate = useMemo(() => startDateProp || new Date(), [startDateProp]);

	// Calculate next occurrences for preview
	const nextOccurrences = useMemo(
		() => getNextOccurrences(config, startDate, 5),
		[config, startDate],
	);

	// Store the latest onChange callback in a ref to avoid dependency issues
	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	// Update config when rrule prop changes (from external source or advanced tab)
	useEffect(() => {
		const parsed = parseRRULE(rrule);
		if (parsed) {
			setConfig(parsed);
		} else if (!rrule || !rrule.trim()) {
			// Reset to default if rrule is empty
			setConfig({
				frequency: null,
				interval: 1,
				endType: "never",
			});
		}
	}, [rrule]);

	// Generate RRULE when config changes (from simple tab)
	useEffect(() => {
		if (config.frequency) {
			const generated = generateRRULE(config);
			if (generated !== rrule) {
				onChangeRef.current(generated);
			}
		} else if (rrule?.trim()) {
			// If config has no frequency but rrule exists, try to parse it
			const parsed = parseRRULE(rrule);
			if (!parsed) {
				// If it can't be parsed, clear it
				onChangeRef.current("");
			}
		} else {
			onChangeRef.current("");
		}
	}, [config, rrule]);

	const updateConfig = (updates: Partial<RecurrenceConfig>) => {
		setConfig({ ...config, ...updates });
	};

	const handlePresetClick = (preset: (typeof RECURRENCE_PRESETS)[number]) => {
		onChange(preset.rrule);
	};

	const toggleByDay = (day: string) => {
		const current = config.byDay || [];
		const updated = current.includes(day)
			? current.filter((d) => d !== day)
			: [...current, day];
		updateConfig({ byDay: updated.length > 0 ? updated : undefined });
	};

	const toggleByMonth = (month: number) => {
		const current = config.byMonth || [];
		const updated = current.includes(month)
			? current.filter((m) => m !== month)
			: [...current, month];
		updateConfig({ byMonth: updated.length > 0 ? updated : undefined });
	};

	const isFullyRepresentable = canFullyRepresent(rrule);

	return (
		<div className="w-full space-y-4">
			{/* Quick Presets */}
			{!config.frequency && (
				<QuickPresetsSection
					onPresetClick={handlePresetClick}
					disabled={disabled}
				/>
			)}

			{/* Warning if rrule exists but can't be fully represented */}
			{rrule?.trim() && !isFullyRepresentable && (
				<ComplexRuleWarning onRemove={() => onChange("")} disabled={disabled} />
			)}

			{/* Fréquence */}
			<div className="space-y-2">
				<Label>Frequency</Label>
				<Select
					value={config.frequency || "none"}
					onValueChange={(value) =>
						updateConfig({
							frequency:
								value === "none"
									? null
									: (value as RecurrenceConfig["frequency"]),
							byDay: undefined,
							byMonthDay: undefined,
							byMonth: undefined,
						})
					}
					disabled={disabled}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select a frequency" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">No recurrence</SelectItem>
						<SelectItem value="DAILY">Daily</SelectItem>
						<SelectItem value="WEEKLY">Weekly</SelectItem>
						<SelectItem value="MONTHLY">Monthly</SelectItem>
						<SelectItem value="YEARLY">Yearly</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{config.frequency && (
				<>
					<IntervalInput
						config={config}
						onUpdate={updateConfig}
						disabled={disabled}
					/>
					{config.frequency === "WEEKLY" && (
						<WeeklyDaysSelector
							byDay={config.byDay}
							onToggle={toggleByDay}
							disabled={disabled}
						/>
					)}
					{config.frequency === "MONTHLY" && (
						<MonthlyDaySelector
							byMonthDay={config.byMonthDay}
							onUpdate={updateConfig}
							disabled={disabled}
						/>
					)}
					{config.frequency === "YEARLY" && (
						<YearlyMonthsSelector
							byMonth={config.byMonth}
							onToggle={toggleByMonth}
							disabled={disabled}
						/>
					)}
					<EndTypeSelector
						config={config}
						onUpdate={updateConfig}
						disabled={disabled}
					/>
					<OccurrencesPreview
						occurrences={nextOccurrences}
						showInfiniteHint={
							config.endType === "never" && nextOccurrences.length === 5
						}
					/>
				</>
			)}
		</div>
	);
}
