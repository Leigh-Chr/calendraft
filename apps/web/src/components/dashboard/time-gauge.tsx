import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TimeGaugeProps {
	hoursOccupied: number;
	hoursAvailable: number;
	percentageOccupied: number;
}

export function TimeGauge({
	hoursOccupied,
	hoursAvailable,
	percentageOccupied,
}: TimeGaugeProps) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Clock className="h-5 w-5" />
					Time usage
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Occupied</span>
						<span className="font-medium">
							{hoursOccupied}h / {hoursAvailable}h
						</span>
					</div>
					<Progress
						value={percentageOccupied}
						className={cn(
							"h-3",
							percentageOccupied > 80 && "[&>div]:bg-amber-500",
							percentageOccupied > 95 && "[&>div]:bg-destructive",
						)}
					/>
					<div className="flex justify-center text-xs">
						<span
							className={cn(
								"font-medium",
								percentageOccupied > 80
									? "text-amber-600 dark:text-amber-400"
									: "text-muted-foreground",
							)}
						>
							{percentageOccupied}% occupied
						</span>
					</div>
				</div>

				<p className="text-muted-foreground text-xs">
					Based on {hoursAvailable}h available work time
				</p>
			</CardContent>
		</Card>
	);
}
