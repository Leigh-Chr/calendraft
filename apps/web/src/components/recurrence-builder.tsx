import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { fr } from "date-fns/locale";
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
	{ label: "Quotidien", rrule: "FREQ=DAILY", icon: "📅" },
	{ label: "Chaque semaine", rrule: "FREQ=WEEKLY", icon: "📆" },
	{ label: "Chaque mois", rrule: "FREQ=MONTHLY", icon: "🗓️" },
	{
		label: "Jours ouvrés",
		rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
		icon: "💼",
	},
	{ label: "Chaque année", rrule: "FREQ=YEARLY", icon: "🎂" },
] as const;

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
	let iteration = 0;
	const maxIterations = 100; // Safety limit

	while (dates.length < count && iteration < maxIterations) {
		iteration++;

		// Check if this date should be included based on BYDAY
		let shouldInclude = true;
		if (config.frequency === "WEEKLY" && config.byDay?.length) {
			const dayMap: Record<string, number> = {
				SU: 0,
				MO: 1,
				TU: 2,
				WE: 3,
				TH: 4,
				FR: 5,
				SA: 6,
			};
			const currentDayCode = Object.entries(dayMap).find(
				([_, num]) => num === currentDate.getDay(),
			)?.[0];
			shouldInclude = config.byDay.includes(currentDayCode || "");
		}

		// Check end conditions
		if (
			config.endType === "count" &&
			config.count &&
			dates.length >= config.count
		) {
			break;
		}
		if (
			config.endType === "until" &&
			config.until &&
			currentDate > config.until
		) {
			break;
		}

		if (shouldInclude && currentDate >= startDate) {
			dates.push(new Date(currentDate));
		}

		// Move to next occurrence
		switch (config.frequency) {
			case "DAILY":
				currentDate = addDays(currentDate, shouldInclude ? interval : 1);
				break;
			case "WEEKLY":
				if (config.byDay?.length) {
					currentDate = addDays(currentDate, 1);
				} else {
					currentDate = addWeeks(currentDate, interval);
				}
				break;
			case "MONTHLY":
				currentDate = addMonths(currentDate, interval);
				break;
			case "YEARLY":
				currentDate = addYears(currentDate, interval);
				break;
		}
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
	{ value: "MO", label: "Lundi" },
	{ value: "TU", label: "Mardi" },
	{ value: "WE", label: "Mercredi" },
	{ value: "TH", label: "Jeudi" },
	{ value: "FR", label: "Vendredi" },
	{ value: "SA", label: "Samedi" },
	{ value: "SU", label: "Dimanche" },
];

const MONTHS = [
	{ value: 1, label: "Janvier" },
	{ value: 2, label: "Février" },
	{ value: 3, label: "Mars" },
	{ value: 4, label: "Avril" },
	{ value: 5, label: "Mai" },
	{ value: 6, label: "Juin" },
	{ value: 7, label: "Juillet" },
	{ value: 8, label: "Août" },
	{ value: 9, label: "Septembre" },
	{ value: 10, label: "Octobre" },
	{ value: 11, label: "Novembre" },
	{ value: 12, label: "Décembre" },
];

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
	const getIntervalPrefix = (frequency: string | null): string => {
		return frequency === "WEEKLY" ? "Toutes les" : "Tous les";
	};

	// Get interval unit label
	const getIntervalUnit = (
		frequency: string | null,
		interval: number,
	): string => {
		const units: Record<string, string> = {
			DAILY: `jour${interval > 1 ? "s" : ""}`,
			WEEKLY: `semaine${interval > 1 ? "s" : ""}`,
			MONTHLY: "mois",
			YEARLY: `an${interval > 1 ? "s" : ""}`,
		};
		return frequency ? units[frequency] || "" : "";
	};

	// Get interval description
	const getIntervalDescription = (
		frequency: string | null,
		interval: number,
	): string => {
		const descriptions: Record<string, string> = {
			DAILY: `L'événement se répétera tous les ${interval} jour${interval > 1 ? "s" : ""}.`,
			WEEKLY: `L'événement se répétera toutes les ${interval} semaine${interval > 1 ? "s" : ""}.`,
			MONTHLY: `L'événement se répétera tous les ${interval} mois.`,
			YEARLY: `L'événement se répétera tous les ${interval} an${interval > 1 ? "s" : ""}.`,
		};
		return frequency ? descriptions[frequency] || "" : "";
	};

	// Check if the current rrule can be fully represented in the simple UI
	const canFullyRepresent = (rrule: string): boolean => {
		if (!rrule || !rrule.trim()) return true;
		const parsed = parseRRULE(rrule);
		if (!parsed) return false;

		const parts = rrule.split(";");
		for (const part of parts) {
			const [key] = part.split("=");
			if (
				key &&
				!SUPPORTED_RRULE_KEYS.includes(
					key as (typeof SUPPORTED_RRULE_KEYS)[number],
				)
			) {
				return false;
			}
		}
		return true;
	};

	const isFullyRepresentable = canFullyRepresent(rrule);

	return (
		<div className="w-full space-y-4">
			{/* Quick Presets */}
			{!config.frequency && (
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-muted-foreground text-sm">
						<Sparkles className="h-4 w-4" />
						<span>Récurrences rapides</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{RECURRENCE_PRESETS.map((preset) => (
							<Button
								key={preset.label}
								type="button"
								variant="outline"
								size="sm"
								onClick={() => handlePresetClick(preset)}
								disabled={disabled}
								className="h-8"
							>
								<span className="mr-1.5">{preset.icon}</span>
								{preset.label}
							</Button>
						))}
					</div>
				</div>
			)}

			{/* Warning if rrule exists but can't be fully represented */}
			{rrule?.trim() && !isFullyRepresentable && (
				<div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/20">
					<div className="flex items-start gap-2">
						<AlertCircle className="mt-0.5 h-4 w-4 text-orange-600 dark:text-orange-400" />
						<div className="flex-1">
							<p className="font-medium text-orange-800 text-sm dark:text-orange-200">
								Règle de récurrence complexe détectée
							</p>
							<p className="mt-1 text-orange-700 text-xs dark:text-orange-300">
								Cette règle de récurrence contient des paramètres avancés qui ne
								peuvent pas être modifiés via l'interface simple. Pour la
								modifier, vous devrez la supprimer et en créer une nouvelle.
							</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onChange("")}
								disabled={disabled}
								className="mt-2"
							>
								Supprimer cette règle
							</Button>
						</div>
					</div>
				</div>
			)}
			{/* Fréquence */}
			<div className="space-y-2">
				<Label>Fréquence</Label>
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
						<SelectValue placeholder="Sélectionner une fréquence" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">Aucune récurrence</SelectItem>
						<SelectItem value="DAILY">Quotidien</SelectItem>
						<SelectItem value="WEEKLY">Hebdomadaire</SelectItem>
						<SelectItem value="MONTHLY">Mensuel</SelectItem>
						<SelectItem value="YEARLY">Annuel</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{config.frequency && (
				<>
					{/* Intervalle */}
					<div className="space-y-2">
						<Label htmlFor="recurrence-interval">Répéter</Label>
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
									updateConfig({
										interval: Math.max(
											1,
											Number.parseInt(e.target.value, 10) || 1,
										),
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

					{/* Jours de la semaine (WEEKLY) */}
					{config.frequency === "WEEKLY" && (
						<div className="space-y-2">
							<Label>Quels jours de la semaine ?</Label>
							<div className="grid grid-cols-2 gap-2">
								{DAYS_OF_WEEK.map((day) => (
									<div key={day.value} className="flex items-center space-x-2">
										<Checkbox
											id={`day-${day.value}`}
											checked={config.byDay?.includes(day.value) || false}
											onCheckedChange={() => toggleByDay(day.value)}
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
								{config.byDay && config.byDay.length > 0
									? `L'événement se répétera chaque ${config.byDay.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label).join(", ")}.`
									: "Sélectionnez au moins un jour. Si aucun jour n'est sélectionné, l'événement se répétera le jour de la semaine de la date de début."}
							</p>
						</div>
					)}

					{/* Jour du mois (MONTHLY) */}
					{config.frequency === "MONTHLY" && (
						<div className="space-y-2">
							<Label htmlFor="recurrence-month-day">Quel jour du mois ?</Label>
							<Select
								value={config.byMonthDay?.toString() || "none"}
								onValueChange={(value) =>
									updateConfig({
										byMonthDay:
											value === "none" ? undefined : Number.parseInt(value, 10),
									})
								}
								disabled={disabled}
							>
								<SelectTrigger id="recurrence-month-day">
									<SelectValue placeholder="Sélectionner un jour" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										Même jour que la date de début
									</SelectItem>
									{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
										<SelectItem key={day} value={day.toString()}>
											Jour {day}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-muted-foreground text-xs">
								{config.byMonthDay
									? `L'événement se répétera le ${config.byMonthDay} de chaque mois.`
									: "L'événement se répétera le même jour du mois que la date de début."}
							</p>
						</div>
					)}

					{/* Mois (YEARLY) */}
					{config.frequency === "YEARLY" && (
						<div className="space-y-2">
							<Label>Quels mois ?</Label>
							<div className="grid grid-cols-3 gap-2">
								{MONTHS.map((month) => (
									<div
										key={month.value}
										className="flex items-center space-x-2"
									>
										<Checkbox
											id={`month-${month.value}`}
											checked={config.byMonth?.includes(month.value) || false}
											onCheckedChange={() => toggleByMonth(month.value)}
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
								{config.byMonth && config.byMonth.length > 0
									? `L'événement se répétera en ${config.byMonth.map((m) => MONTHS.find((month) => month.value === m)?.label).join(", ")}.`
									: "Sélectionnez au moins un mois. Si aucun mois n'est sélectionné, l'événement se répétera le même mois que la date de début."}
							</p>
						</div>
					)}

					{/* Fin de récurrence */}
					<div className="space-y-2">
						<Label>Quand se termine la récurrence ?</Label>
						<RadioGroup
							value={config.endType}
							onValueChange={(value: "never" | "count" | "until") =>
								updateConfig({
									endType: value,
									count: undefined,
									until: undefined,
								})
							}
							disabled={disabled}
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="never" id="end-never" />
								<Label
									htmlFor="end-never"
									className="cursor-pointer font-normal"
								>
									Jamais (répétition infinie)
								</Label>
							</div>
							<div className="flex flex-wrap items-center gap-2 space-x-2">
								<RadioGroupItem value="count" id="end-count" />
								<Label
									htmlFor="end-count"
									className="cursor-pointer font-normal"
								>
									Après
								</Label>
								{config.endType === "count" && (
									<>
										<Input
											type="number"
											min="1"
											value={config.count || ""}
											onChange={(e) =>
												updateConfig({
													count:
														Number.parseInt(e.target.value, 10) || undefined,
												})
											}
											disabled={disabled}
											className="w-20"
											placeholder="10"
										/>
										<span className="text-muted-foreground text-sm">
											occurrences
										</span>
									</>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-2 space-x-2">
								<RadioGroupItem value="until" id="end-until" />
								<Label
									htmlFor="end-until"
									className="cursor-pointer font-normal"
								>
									Jusqu'au
								</Label>
								{config.endType === "until" && (
									<Popover>
										<PopoverTrigger asChild>
											<Button
												type="button"
												variant="outline"
												disabled={disabled}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{config.until
													? format(config.until, "PPP", { locale: fr })
													: "Sélectionner une date"}
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={config.until}
												onSelect={(date) => updateConfig({ until: date })}
												disabled={disabled}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
								)}
							</div>
						</RadioGroup>
						<p className="text-muted-foreground text-xs">
							{config.endType === "never" &&
								"L'événement se répétera indéfiniment."}
							{config.endType === "count" &&
								config.count &&
								`L'événement se répétera ${config.count} fois au total.`}
							{config.endType === "until" &&
								config.until &&
								`L'événement se répétera jusqu'au ${format(config.until, "PPP", { locale: fr })}.`}
							{config.endType === "until" &&
								!config.until &&
								"Sélectionnez une date de fin pour la récurrence."}
						</p>
					</div>

					{/* Preview of next occurrences */}
					{nextOccurrences.length > 0 && (
						<div className="rounded-lg border bg-muted/30 p-4">
							<p className="mb-3 flex items-center gap-2 font-medium text-sm">
								<CalendarIcon className="h-4 w-4 text-primary" />
								Prochaines occurrences
							</p>
							<div className="flex flex-wrap gap-2">
								{nextOccurrences.map((date, index) => (
									<Badge
										key={date.toISOString()}
										variant="secondary"
										className={cn(
											"text-xs",
											index === 0 && "bg-primary/10 text-primary",
										)}
									>
										{format(date, "EEE d MMM", { locale: fr })}
									</Badge>
								))}
							</div>
							{config.endType === "never" && nextOccurrences.length === 5 && (
								<p className="mt-2 text-muted-foreground text-xs">
									Et ainsi de suite...
								</p>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
}
