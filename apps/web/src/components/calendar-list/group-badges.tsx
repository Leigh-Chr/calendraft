import { useQuery } from "@tanstack/react-query";
import { Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

interface CalendarGroupBadgesProps {
	calendarId: string;
}

export function CalendarGroupBadges({ calendarId }: CalendarGroupBadgesProps) {
	const { data: groups } = useQuery({
		...trpc.calendar.group.getByCalendarId.queryOptions({ calendarId }),
	});

	if (!groups || groups.length === 0) {
		return null;
	}

	return (
		<div className="mb-2 flex flex-wrap gap-1">
			{groups.map((group) => (
				<Badge
					key={group.id}
					variant="secondary"
					className={cn(
						"flex items-center gap-1 text-xs",
						group.color && "border",
					)}
					style={{
						borderColor: group.color || undefined,
						backgroundColor: group.color ? `${group.color}20` : undefined,
					}}
				>
					<Folder className="h-3 w-3" />
					{group.name}
				</Badge>
			))}
		</div>
	);
}
