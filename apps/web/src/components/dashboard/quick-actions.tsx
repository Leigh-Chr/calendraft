import { Link } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
	return (
		<div className="flex flex-wrap gap-2">
			<Button size="sm" asChild>
				<Link to="/calendars/new">
					<Plus className="mr-1.5 h-4 w-4" />
					New calendar
				</Link>
			</Button>
			<Button size="sm" variant="outline" asChild>
				<Link to="/calendars/import">
					<FileUp className="mr-1.5 h-4 w-4" />
					Import
				</Link>
			</Button>
		</div>
	);
}
