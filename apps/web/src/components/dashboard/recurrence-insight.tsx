import { RefreshCw } from "lucide-react";
import { InsightCard, InsightList, InsightStat } from "./insight-card";

interface RecurrenceInsightProps {
	totalRecurring: number;
	totalEvents: number;
	percentage: number;
	byFrequency: {
		daily: number;
		weekly: number;
		monthly: number;
		yearly: number;
	};
}

export function RecurrenceInsight({
	totalRecurring,
	totalEvents,
	percentage,
	byFrequency,
}: RecurrenceInsightProps) {
	const frequencyItems = [
		{ label: "Weekly", value: byFrequency.weekly },
		{ label: "Monthly", value: byFrequency.monthly },
		{ label: "Daily", value: byFrequency.daily },
		{ label: "Yearly", value: byFrequency.yearly },
	].filter((item) => item.value > 0);

	return (
		<InsightCard title="Recurrence" icon={RefreshCw}>
			<div className="space-y-4">
				<InsightStat
					value={`${percentage}%`}
					label="recurring events"
					sublabel={`${totalRecurring} of ${totalEvents} total`}
				/>
				{frequencyItems.length > 0 && <InsightList items={frequencyItems} />}
			</div>
		</InsightCard>
	);
}
