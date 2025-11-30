import { useEffect, useState } from "react";
import { parseDuration } from "@/lib/alarm-parser";
import type { AlarmFormData } from "@/lib/event-form-types";

export interface AlarmTrigger {
	when: "before" | "at" | "after";
	value: number;
	unit: "minutes" | "hours" | "days";
}

/**
 * Hook to manage alarm triggers UI state
 * Synchronizes trigger state with alarm data and provides update function
 */
export function useAlarmTriggers(alarms: AlarmFormData[] | undefined) {
	const [alarmTriggers, setAlarmTriggers] = useState<Map<number, AlarmTrigger>>(
		new Map(),
	);

	// Initialize alarm triggers from alarms
	useEffect(() => {
		const triggers = new Map<number, AlarmTrigger>();
		alarms?.forEach((alarm, index) => {
			const parsed = parseDuration(alarm.trigger);
			if (parsed) {
				triggers.set(index, parsed);
			} else {
				// Default trigger if parsing fails
				triggers.set(index, { when: "before", value: 15, unit: "minutes" });
			}
		});
		setAlarmTriggers(triggers);
	}, [alarms]);

	return alarmTriggers;
}
