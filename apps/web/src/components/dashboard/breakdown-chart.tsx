import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NoDataMessage } from "./empty-states";

interface CategoryBreakdown {
	category: string;
	hours: number;
	eventCount: number;
	percentage: number;
}

interface CalendarBreakdown {
	calendarId: string;
	calendarName: string;
	calendarColor: string | null;
	hours: number;
	eventCount: number;
	percentage: number;
}

interface BreakdownChartProps {
	byCategory: CategoryBreakdown[];
	byCalendar: CalendarBreakdown[];
	hasCategories: boolean;
}

// Simple colors for categories (if no calendar color)
const CATEGORY_COLORS = [
	"#6366f1", // indigo
	"#8b5cf6", // violet
	"#ec4899", // pink
	"#f43f5e", // rose
	"#f97316", // orange
	"#eab308", // yellow
	"#22c55e", // green
	"#14b8a6", // teal
	"#06b6d4", // cyan
	"#3b82f6", // blue
];

function BreakdownRow({
	label,
	hours,
	percentage,
	color,
}: {
	label: string;
	hours: number;
	percentage: number;
	color: string;
}) {
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div
						className="h-3 w-3 rounded-full"
						style={{ backgroundColor: color }}
					/>
					<span className="text-sm">{label}</span>
				</div>
				<span className="font-medium text-sm">{hours}h</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="h-2 flex-1 rounded-full bg-muted">
					<div
						className="h-2 rounded-full transition-all"
						style={{ width: `${percentage}%`, backgroundColor: color }}
					/>
				</div>
				<span className="w-12 text-right text-muted-foreground text-xs">
					{percentage}%
				</span>
			</div>
		</div>
	);
}

export function BreakdownChart({
	byCategory,
	byCalendar,
	hasCategories,
}: BreakdownChartProps) {
	const data = hasCategories ? byCategory : byCalendar;
	const title = hasCategories ? "Time by category" : "Time by calendar";

	if (data.length === 0) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="flex items-center gap-2 text-lg">
						<PieChart className="h-5 w-5" />
						{title}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<NoDataMessage message="No data available for this period." />
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-lg">
					<PieChart className="h-5 w-5" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{hasCategories
					? byCategory
							.slice(0, 6)
							.map((item, index) => (
								<BreakdownRow
									key={item.category}
									label={item.category}
									hours={item.hours}
									percentage={item.percentage}
									color={
										CATEGORY_COLORS[index % CATEGORY_COLORS.length] || "#6366f1"
									}
								/>
							))
					: byCalendar
							.slice(0, 6)
							.map((item, index) => (
								<BreakdownRow
									key={item.calendarId}
									label={item.calendarName}
									hours={item.hours}
									percentage={item.percentage}
									color={
										item.calendarColor ||
										CATEGORY_COLORS[index % CATEGORY_COLORS.length] ||
										"#6366f1"
									}
								/>
							))}

				{!hasCategories && (
					<p className="text-muted-foreground text-xs">
						Tip: Add categories to your events for more detailed insights.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
