/**
 * Calendar export utilities
 */

import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

/**
 * Export group as ICS file
 */
export async function exportGroupAsICSFile(groupId: string): Promise<void> {
	const group = await trpcClient.calendar.group.getById.query({
		id: groupId,
	});
	const calendarsArray = Array.isArray(group.calendars) ? group.calendars : [];
	if (calendarsArray.length === 0) {
		toast.error("No calendars to export");
		return;
	}

	const bundle = await trpcClient.share.bundle.create.mutate({
		groupId: groupId,
		removeDuplicates: false,
	});

	const data = await trpcClient.share.bundle.getByToken.query({
		token: bundle.token,
	});

	const blob = new Blob([data.icsContent], { type: "text/calendar" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${group.name.replace(/[^a-z0-9]/gi, "_")}.ics`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);

	await trpcClient.share.bundle.delete.mutate({ id: bundle.id });
}
