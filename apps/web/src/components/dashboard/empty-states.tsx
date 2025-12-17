import { Link } from "@tanstack/react-router";
import { Calendar, FileUp, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
	type: "no-calendars" | "no-events" | "no-conflicts" | "free-day";
}

export function EmptyState({ type }: EmptyStateProps) {
	switch (type) {
		case "no-calendars":
			return (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12 text-center">
						<div className="mb-4 rounded-full bg-primary/10 p-4">
							<Calendar className="h-8 w-8 text-primary" />
						</div>
						<h3 className="mb-2 font-semibold text-lg">
							Welcome to your Dashboard
						</h3>
						<p className="mb-6 max-w-md text-muted-foreground text-sm">
							Create your first calendar to start tracking your events and see
							analytics about your schedule.
						</p>
						<div className="flex flex-wrap justify-center gap-2">
							<Button asChild>
								<Link to="/calendars/new">
									<Plus className="mr-1.5 h-4 w-4" />
									Create calendar
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link to="/calendars/import">
									<FileUp className="mr-1.5 h-4 w-4" />
									Import .ics
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			);

		case "no-events":
			return (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-8 text-center">
						<div className="mb-3 rounded-full bg-muted p-3">
							<Calendar className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="mb-1 font-medium">No events yet</p>
						<p className="text-muted-foreground text-sm">
							Add events to your calendars to see them here.
						</p>
					</CardContent>
				</Card>
			);

		case "no-conflicts":
			return null; // Good news, no need to display anything

		case "free-day":
			return (
				<div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-400">
					<Sparkles className="h-5 w-5" />
					<span className="font-medium text-sm">
						Free day! No events scheduled.
					</span>
				</div>
			);

		default:
			return null;
	}
}

export function NoDataMessage({ message }: { message: string }) {
	return (
		<div className="py-6 text-center">
			<p className="text-muted-foreground text-sm">{message}</p>
		</div>
	);
}
