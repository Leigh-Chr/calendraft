import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataHealthProps {
	eventsWithoutTitle: number;
	eventsWithoutDescription: number;
	tentativeEvents: number;
	cancelledEvents: number;
	oldEvents: number;
	emptyCalendars: number;
	potentialDuplicates: number;
	expiredShareLinks: number;
}

interface HealthItem {
	label: string;
	value: number;
	severity: "ok" | "warning" | "error";
	action?: {
		label: string;
		href: string;
	};
}

function getSeverity(value: number, threshold?: number): "ok" | "warning" {
	if (value === 0) return "ok";
	if (threshold !== undefined && value > threshold) return "warning";
	return value > 0 ? "warning" : "ok";
}

function getDuplicateSeverity(value: number): "ok" | "warning" | "error" {
	if (value === 0) return "ok";
	if (value > 10) return "error";
	return "warning";
}

function createHealthItems({
	eventsWithoutTitle,
	eventsWithoutDescription,
	tentativeEvents,
	cancelledEvents,
	oldEvents,
	emptyCalendars,
	potentialDuplicates,
	expiredShareLinks,
}: DataHealthProps): HealthItem[] {
	return [
		{
			label: "Events without title",
			value: eventsWithoutTitle,
			severity: getSeverity(eventsWithoutTitle),
		},
		{
			label: "Events without description",
			value: eventsWithoutDescription,
			severity: getSeverity(eventsWithoutDescription),
		},
		{
			label: "Tentative events",
			value: tentativeEvents,
			severity: getSeverity(tentativeEvents),
			action:
				tentativeEvents > 0
					? { label: "Review", href: "/calendars" }
					: undefined,
		},
		{
			label: "Cancelled events",
			value: cancelledEvents,
			severity: getSeverity(cancelledEvents),
			action:
				cancelledEvents > 0
					? { label: "Clean up", href: "/calendars" }
					: undefined,
		},
		{
			label: "Old events (>6 months)",
			value: oldEvents,
			severity: oldEvents === 0 ? "ok" : oldEvents > 100 ? "warning" : "ok",
			action:
				oldEvents > 0 ? { label: "Clean up", href: "/calendars" } : undefined,
		},
		{
			label: "Empty calendars",
			value: emptyCalendars,
			severity: getSeverity(emptyCalendars),
			action:
				emptyCalendars > 0 ? { label: "View", href: "/calendars" } : undefined,
		},
		{
			label: "Potential duplicates",
			value: potentialDuplicates,
			severity: getDuplicateSeverity(potentialDuplicates),
			action:
				potentialDuplicates > 0
					? { label: "Review", href: "/calendars" }
					: undefined,
		},
		{
			label: "Expired share links",
			value: expiredShareLinks,
			severity: getSeverity(expiredShareLinks),
			action:
				expiredShareLinks > 0
					? { label: "Renew", href: "/calendars" }
					: undefined,
		},
	];
}

export function DataHealth(props: DataHealthProps) {
	const healthItems = createHealthItems(props);

	const totalIssues = healthItems.reduce(
		(sum, item) => sum + (item.severity !== "ok" ? 1 : 0),
		0,
	);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Heart className="h-5 w-5" />
					Data health
					{totalIssues === 0 ? (
						<span className="ml-auto flex items-center gap-1 font-normal text-emerald-600 text-sm dark:text-emerald-400">
							<CheckCircle2 className="h-4 w-4" />
							All good
						</span>
					) : (
						<span className="ml-auto font-normal text-muted-foreground text-sm">
							{totalIssues} {totalIssues === 1 ? "issue" : "issues"}
						</span>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ul className="space-y-2">
					{healthItems.map((item) => (
						<li
							key={item.label}
							className={cn(
								"flex items-center justify-between rounded-lg px-3 py-2 text-sm",
								item.severity === "ok" && "bg-muted/50",
								item.severity === "warning" && "bg-amber-500/10",
								item.severity === "error" && "bg-destructive/10",
							)}
						>
							<div className="flex items-center gap-2">
								{item.severity === "ok" ? (
									<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
								) : (
									<AlertCircle
										className={cn(
											"h-4 w-4",
											item.severity === "warning" &&
												"text-amber-600 dark:text-amber-400",
											item.severity === "error" && "text-destructive",
										)}
									/>
								)}
								<span className={cn(item.severity !== "ok" && "font-medium")}>
									{item.label}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span
									className={cn(
										"font-medium",
										item.severity === "ok" && "text-muted-foreground",
										item.severity === "warning" &&
											"text-amber-600 dark:text-amber-400",
										item.severity === "error" && "text-destructive",
									)}
								>
									{item.value}
								</span>
								{item.action && (
									<Link
										to={item.action.href}
										className="text-primary text-xs hover:underline"
									>
										{item.action.label}
									</Link>
								)}
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
}
