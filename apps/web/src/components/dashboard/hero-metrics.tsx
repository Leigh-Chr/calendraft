import { formatDistanceToNow } from "date-fns";
import {
	ArrowDown,
	ArrowUp,
	Calendar,
	Clock,
	Minus,
	TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HeroMetricsProps {
	eventsToday: number;
	eventsPeriod: number;
	eventsPreviousPeriod: number;
	hoursOccupied: number;
	hoursPreviousPeriod: number;
	avgDuration: number;
	nextEvent: {
		id: string;
		title: string;
		startDate: string | Date;
		calendarName: string;
		calendarColor: string | null;
	} | null;
	pendingInvitations: number;
	periodLabel: string;
}

function formatVariation(
	current: number,
	previous: number,
): {
	percentage: number;
	direction: "up" | "down" | "neutral";
} {
	if (previous === 0) {
		return {
			percentage: current > 0 ? 100 : 0,
			direction: current > 0 ? "up" : "neutral",
		};
	}
	const diff = ((current - previous) / previous) * 100;
	return {
		percentage: Math.abs(Math.round(diff)),
		direction: diff > 0 ? "up" : diff < 0 ? "down" : "neutral",
	};
}

function VariationBadge({
	current,
	previous,
}: {
	current: number;
	previous: number;
}) {
	const { percentage, direction } = formatVariation(current, previous);

	if (direction === "neutral" || percentage === 0) {
		return (
			<span className="inline-flex items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5 font-medium text-muted-foreground text-xs">
				<Minus className="h-3 w-3" />
				0%
			</span>
		);
	}

	return (
		<span
			className={cn(
				"inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium text-xs",
				direction === "up"
					? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
					: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
			)}
		>
			{direction === "up" ? (
				<ArrowUp className="h-3 w-3" />
			) : (
				<ArrowDown className="h-3 w-3" />
			)}
			{percentage}%
		</span>
	);
}

function MetricCard({
	title,
	value,
	subtitle,
	icon: Icon,
	variation,
}: {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ComponentType<{ className?: string }>;
	variation?: { current: number; previous: number };
}) {
	return (
		<Card className="relative overflow-hidden">
			<CardContent className="p-4 sm:p-6">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-muted-foreground text-sm">{title}</p>
						<p className="font-bold text-2xl tracking-tight sm:text-3xl">
							{value}
						</p>
						{subtitle && (
							<p className="text-muted-foreground text-xs">{subtitle}</p>
						)}
					</div>
					<div className="rounded-lg bg-primary/10 p-2">
						<Icon className="h-5 w-5 text-primary" />
					</div>
				</div>
				{variation && (
					<div className="mt-3">
						<VariationBadge
							current={variation.current}
							previous={variation.previous}
						/>
						<span className="ml-1.5 text-muted-foreground text-xs">
							vs previous
						</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export function HeroMetrics({
	eventsToday,
	eventsPeriod,
	eventsPreviousPeriod,
	hoursOccupied,
	hoursPreviousPeriod,
	avgDuration,
	nextEvent,
	pendingInvitations,
	periodLabel,
}: HeroMetricsProps) {
	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			{periodLabel !== "today" && (
				<MetricCard
					title="Today"
					value={eventsToday}
					subtitle={eventsToday === 1 ? "event" : "events"}
					icon={Calendar}
				/>
			)}
			<MetricCard
				title={`This ${periodLabel}`}
				value={eventsPeriod}
				subtitle={eventsPeriod === 1 ? "event" : "events"}
				icon={TrendingUp}
				variation={{ current: eventsPeriod, previous: eventsPreviousPeriod }}
			/>
			<MetricCard
				title="Hours occupied"
				value={`${hoursOccupied}h`}
				subtitle={`Avg: ${avgDuration.toFixed(1)}h`}
				icon={Clock}
				variation={{ current: hoursOccupied, previous: hoursPreviousPeriod }}
			/>
			<Card className="relative overflow-hidden">
				<CardContent className="p-4 sm:p-6">
					<div className="flex items-start justify-between">
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Next event</p>
							{nextEvent ? (
								<>
									<p className="line-clamp-1 font-bold text-lg tracking-tight">
										{nextEvent.title}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatDistanceToNow(new Date(nextEvent.startDate), {
											addSuffix: true,
										})}
									</p>
									{pendingInvitations > 0 && (
										<p className="text-amber-600 text-xs dark:text-amber-400">
											{pendingInvitations} pending invitation
											{pendingInvitations > 1 ? "s" : ""}
										</p>
									)}
								</>
							) : (
								<p className="text-muted-foreground text-sm">
									No upcoming events
								</p>
							)}
						</div>
						{nextEvent?.calendarColor && (
							<div
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: nextEvent.calendarColor }}
							/>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
