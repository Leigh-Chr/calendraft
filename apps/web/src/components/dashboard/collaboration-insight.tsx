import { Users } from "lucide-react";
import { InsightCard, InsightList, InsightStat } from "./insight-card";

interface CollaborationInsightProps {
	eventsWithAttendees: number;
	uniqueContacts: number;
	topContacts: Array<{ email: string; count: number }>;
	rsvpStatus: {
		needsAction: number;
		accepted: number;
		declined: number;
		tentative: number;
	};
}

export function CollaborationInsight({
	eventsWithAttendees,
	uniqueContacts,
	topContacts,
	rsvpStatus,
}: CollaborationInsightProps) {
	const rsvpItems = [
		{ label: "Accepted", value: rsvpStatus.accepted },
		{ label: "Needs action", value: rsvpStatus.needsAction },
		{ label: "Tentative", value: rsvpStatus.tentative },
		{ label: "Declined", value: rsvpStatus.declined },
	].filter((item) => item.value > 0);

	return (
		<InsightCard title="Collaboration" icon={Users}>
			<div className="space-y-4">
				<InsightStat
					value={eventsWithAttendees}
					label="events with participants"
					sublabel={`${uniqueContacts} unique contacts`}
				/>
				{rsvpItems.length > 0 && <InsightList items={rsvpItems} />}
				{topContacts.length > 0 && (
					<div className="space-y-2">
						<p className="text-muted-foreground text-xs">Top contacts:</p>
						<ul className="space-y-1">
							{topContacts.slice(0, 3).map((contact) => (
								<li
									key={contact.email}
									className="flex items-center justify-between text-sm"
								>
									<span className="truncate text-muted-foreground">
										{contact.email}
									</span>
									<span className="ml-2 shrink-0 font-medium">
										{contact.count}
									</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</InsightCard>
	);
}
