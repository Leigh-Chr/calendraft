import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { InsightCard, InsightList, InsightStat } from "./insight-card";

interface EventStatusInsightProps {
	confirmed: number;
	tentative: number;
	cancelled: number;
}

export function EventStatusInsight({
	confirmed,
	tentative,
	cancelled,
}: EventStatusInsightProps) {
	const total = confirmed + tentative + cancelled;
	const statusItems = [
		{ label: "Confirmed", value: confirmed, icon: CheckCircle2 },
		{ label: "Tentative", value: tentative, icon: Clock },
		{ label: "Cancelled", value: cancelled, icon: XCircle },
	].filter((item) => item.value > 0);

	if (total === 0) {
		return null;
	}

	const confirmedPercentage =
		total > 0 ? Math.round((confirmed / total) * 100) : 0;

	return (
		<InsightCard title="Event status" icon={CheckCircle2}>
			<div className="space-y-4">
				<InsightStat
					value={`${confirmedPercentage}%`}
					label="confirmed events"
					sublabel={`${confirmed} of ${total} total`}
				/>
				{statusItems.length > 0 && (
					<InsightList
						items={statusItems.map((item) => ({
							label: item.label,
							value: item.value,
						}))}
					/>
				)}
			</div>
		</InsightCard>
	);
}
