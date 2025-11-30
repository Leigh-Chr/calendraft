/**
 * Recurrence rule types based on RFC 5545 RRULE
 */

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrenceConfig {
	frequency: RecurrenceFrequency;
	interval?: number;
	count?: number;
	until?: Date;
	byDay?: Weekday[];
	byMonth?: number[];
	byMonthDay?: number[];
	bySetPos?: number;
}

/**
 * Parse RRULE string to RecurrenceConfig
 */
export function parseRRule(rrule: string): RecurrenceConfig | null {
	if (!rrule) return null;

	const config: RecurrenceConfig = {
		frequency: "DAILY",
	};

	const parts = rrule.split(";");
	for (const part of parts) {
		const [key, value] = part.split("=");
		if (!key || !value) continue;

		switch (key.toUpperCase()) {
			case "FREQ":
				config.frequency = value as RecurrenceFrequency;
				break;
			case "INTERVAL":
				config.interval = Number.parseInt(value, 10);
				break;
			case "COUNT":
				config.count = Number.parseInt(value, 10);
				break;
			case "UNTIL":
				// Parse ICS date format
				config.until = new Date(
					`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
				);
				break;
			case "BYDAY":
				config.byDay = value.split(",") as Weekday[];
				break;
			case "BYMONTH":
				config.byMonth = value.split(",").map((m) => Number.parseInt(m, 10));
				break;
			case "BYMONTHDAY":
				config.byMonthDay = value.split(",").map((d) => Number.parseInt(d, 10));
				break;
			case "BYSETPOS":
				config.bySetPos = Number.parseInt(value, 10);
				break;
		}
	}

	return config;
}

/**
 * Build RRULE string from RecurrenceConfig
 */
export function buildRRule(config: RecurrenceConfig): string {
	const parts: string[] = [`FREQ=${config.frequency}`];

	if (config.interval && config.interval > 1) {
		parts.push(`INTERVAL=${config.interval}`);
	}

	if (config.count) {
		parts.push(`COUNT=${config.count}`);
	}

	if (config.until) {
		const year = config.until.getUTCFullYear();
		const month = String(config.until.getUTCMonth() + 1).padStart(2, "0");
		const day = String(config.until.getUTCDate()).padStart(2, "0");
		parts.push(`UNTIL=${year}${month}${day}T235959Z`);
	}

	if (config.byDay && config.byDay.length > 0) {
		parts.push(`BYDAY=${config.byDay.join(",")}`);
	}

	if (config.byMonth && config.byMonth.length > 0) {
		parts.push(`BYMONTH=${config.byMonth.join(",")}`);
	}

	if (config.byMonthDay && config.byMonthDay.length > 0) {
		parts.push(`BYMONTHDAY=${config.byMonthDay.join(",")}`);
	}

	if (config.bySetPos) {
		parts.push(`BYSETPOS=${config.bySetPos}`);
	}

	return parts.join(";");
}
