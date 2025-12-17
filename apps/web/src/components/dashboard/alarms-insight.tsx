import { Bell } from "lucide-react";
import { InsightCard, InsightStat } from "./insight-card";

interface AlarmsInsightProps {
	eventsWithAlarms: number;
	totalEvents: number;
	percentage: number;
	mostCommonTrigger: string | null;
}

function formatTrigger(trigger: string | null): string {
	if (!trigger) return "None";

	// Parse ISO 8601 duration
	const match = trigger.match(/^-?PT?(\d+)([MHDS])$/i);
	if (!match) return trigger;

	const value = match[1];
	const unit = match[2];
	if (!value || !unit) return trigger;

	const num = Number.parseInt(value, 10);

	switch (unit.toUpperCase()) {
		case "M":
			return `${num} minute${num > 1 ? "s" : ""} before`;
		case "H":
			return `${num} hour${num > 1 ? "s" : ""} before`;
		case "D":
			return `${num} day${num > 1 ? "s" : ""} before`;
		default:
			return trigger;
	}
}

export function AlarmsInsight({
	eventsWithAlarms,
	totalEvents,
	percentage,
	mostCommonTrigger,
}: AlarmsInsightProps) {
	return (
		<InsightCard title="Alarms" icon={Bell}>
			<div className="space-y-4">
				<InsightStat
					value={`${percentage}%`}
					label="events with reminders"
					sublabel={`${eventsWithAlarms} of ${totalEvents} total`}
				/>
				{mostCommonTrigger && (
					<p className="text-muted-foreground text-sm">
						Most common:{" "}
						<span className="font-medium text-foreground">
							{formatTrigger(mostCommonTrigger)}
						</span>
					</p>
				)}
			</div>
		</InsightCard>
	);
}
