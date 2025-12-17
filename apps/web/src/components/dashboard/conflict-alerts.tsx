import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Conflict {
	event1: {
		id: string;
		title: string;
		startDate: string | Date;
		endDate: string | Date;
	};
	event2: {
		id: string;
		title: string;
		startDate: string | Date;
		endDate: string | Date;
	};
}

interface ConflictAlertsProps {
	conflicts: Conflict[];
}

export function ConflictAlerts({ conflicts }: ConflictAlertsProps) {
	if (conflicts.length === 0) {
		return null;
	}

	return (
		<Alert variant="destructive">
			<AlertTriangle className="h-4 w-4" />
			<AlertTitle>
				{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} detected
			</AlertTitle>
			<AlertDescription>
				<ul className="mt-2 space-y-2">
					{conflicts.slice(0, 3).map((conflict) => (
						<li
							key={`${conflict.event1.id}-${conflict.event2.id}`}
							className="text-sm"
						>
							<span className="font-medium">
								{format(
									new Date(conflict.event1.startDate),
									"EEE d MMM, HH:mm",
								)}
							</span>
							:{" "}
							<span className="text-destructive-foreground/80">
								"{conflict.event1.title}" overlaps with "{conflict.event2.title}
								"
							</span>
						</li>
					))}
				</ul>
				{conflicts.length > 3 && (
					<p className="mt-2 text-sm opacity-80">
						And {conflicts.length - 3} more...
					</p>
				)}
				<Button
					variant="outline"
					size="sm"
					className="mt-3 border-destructive/30 text-destructive-foreground hover:bg-destructive/20"
					asChild
				>
					<Link to="/calendars">
						View conflicts
						<ChevronRight className="ml-1 h-4 w-4" />
					</Link>
				</Button>
			</AlertDescription>
		</Alert>
	);
}
