import { Grid3X3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { NoDataMessage } from "./empty-states";

interface HeatmapData {
	dayOfWeek: number;
	hourSlot: string;
	hours: number;
}

interface TimeHeatmapProps {
	heatmap: HeatmapData[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_SLOTS = ["08-10", "10-12", "12-14", "14-17", "17-20"];

function getIntensityClass(hours: number): string {
	if (hours === 0) return "bg-muted";
	if (hours < 2) return "bg-primary/20";
	if (hours < 4) return "bg-primary/40";
	if (hours < 6) return "bg-primary/60";
	return "bg-primary/80";
}

export function TimeHeatmap({ heatmap }: TimeHeatmapProps) {
	if (heatmap.length === 0) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Grid3X3 className="h-5 w-5" />
						Weekly patterns
					</CardTitle>
				</CardHeader>
				<CardContent>
					<NoDataMessage message="Not enough data to show patterns yet." />
				</CardContent>
			</Card>
		);
	}

	// Build a lookup map
	const dataMap = new Map<string, number>();
	for (const item of heatmap) {
		const key = `${item.dayOfWeek}-${item.hourSlot}`;
		dataMap.set(key, item.hours);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Grid3X3 className="h-5 w-5" />
					Weekly patterns
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead>
							<tr>
								<th className="p-1 text-left font-normal text-muted-foreground" />
								{DAYS.map((day) => (
									<th
										key={day}
										className="p-1 text-center font-normal text-muted-foreground"
									>
										{day}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{HOUR_SLOTS.map((slot) => (
								<tr key={slot}>
									<td className="p-1 text-muted-foreground">{slot}</td>
									{DAYS.map((day, dayIndex) => {
										const hours = dataMap.get(`${dayIndex}-${slot}`) || 0;
										return (
											<td key={`${day}-${slot}`} className="p-1">
												<div
													className={cn(
														"mx-auto h-6 w-full min-w-[24px] rounded transition-colors",
														getIntensityClass(hours),
													)}
													title={`${hours.toFixed(1)}h`}
												/>
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="mt-3 flex items-center justify-center gap-2 text-muted-foreground text-xs">
					<span>Less</span>
					<div className="flex gap-0.5">
						<div className="h-3 w-3 rounded bg-muted" />
						<div className="h-3 w-3 rounded bg-primary/20" />
						<div className="h-3 w-3 rounded bg-primary/40" />
						<div className="h-3 w-3 rounded bg-primary/60" />
						<div className="h-3 w-3 rounded bg-primary/80" />
					</div>
					<span>More</span>
				</div>
				<p className="mt-2 text-center text-muted-foreground text-xs">
					Based on the last 4 weeks
				</p>
			</CardContent>
		</Card>
	);
}
