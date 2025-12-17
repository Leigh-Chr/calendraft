import { Link } from "@tanstack/react-router";
import { Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoDataMessage } from "./empty-states";

interface CalendarStats {
	id: string;
	name: string;
	color: string | null;
	eventCount: number;
	eventsThisPeriod: number;
}

interface CalendarsTableProps {
	calendars: CalendarStats[];
	periodLabel: string;
}

export function CalendarsTable({
	calendars,
	periodLabel,
}: CalendarsTableProps) {
	if (calendars.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-lg">
						<Calendar className="h-5 w-5" />
						My calendars
					</CardTitle>
				</CardHeader>
				<CardContent>
					<NoDataMessage message="No calendars found." />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<Calendar className="h-5 w-5" />
					My calendars
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b text-left">
								<th className="pb-3 font-medium text-muted-foreground">
									Calendar
								</th>
								<th className="pb-3 text-right font-medium text-muted-foreground">
									Events
								</th>
								<th className="hidden pb-3 text-right font-medium text-muted-foreground sm:table-cell">
									This {periodLabel}
								</th>
								<th className="pb-3 text-right font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{calendars.map((calendar) => (
								<tr key={calendar.id} className="group">
									<td className="py-3">
										<Link
											to="/calendars/$calendarId"
											params={{ calendarId: calendar.id }}
											className="flex items-center gap-2 hover:underline"
										>
											<div
												className="h-3 w-3 rounded-full"
												style={{
													backgroundColor: calendar.color || "#6366f1",
												}}
											/>
											<span className="font-medium">{calendar.name}</span>
										</Link>
									</td>
									<td className="py-3 text-right">{calendar.eventCount}</td>
									<td className="hidden py-3 text-right sm:table-cell">
										{calendar.eventsThisPeriod}
									</td>
									<td className="py-3 text-right">
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8"
											asChild
										>
											<Link
												to="/calendars/$calendarId"
												params={{ calendarId: calendar.id }}
												title="Settings"
											>
												<Settings className="h-4 w-4" />
											</Link>
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	);
}
