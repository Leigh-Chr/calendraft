import { CalendarPlus, CalendarX, Repeat } from "lucide-react";
import { DateListPicker } from "@/components/date-list-picker";
import { RecurrenceBuilder } from "@/components/recurrence-builder";
import { Label } from "@/components/ui/label";
import { stringifyDateArray } from "@/lib/date-parser";
import type { EventFormData } from "@/lib/event-form-types";

interface RecurrenceSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	rdateList: Date[];
	exdateList: Date[];
	onRdateChange: (dates: Date[]) => void;
	onExdateChange: (dates: Date[]) => void;
	isSubmitting: boolean;
}

/**
 * Section for event recurrence settings (RRULE, RDATE, EXDATE)
 */
export function RecurrenceSection({
	formData,
	onChange,
	rdateList,
	exdateList,
	onRdateChange,
	onExdateChange,
	isSubmitting,
}: RecurrenceSectionProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label className="flex items-center gap-2">
					<Repeat className="h-4 w-4 text-muted-foreground" />
					Recurrence rule
				</Label>
				<RecurrenceBuilder
					rrule={formData.rrule || ""}
					onChange={(rrule) => onChange({ rrule })}
					disabled={isSubmitting}
					startDate={
						formData.startDate ? new Date(formData.startDate) : undefined
					}
				/>
				<p className="text-muted-foreground text-xs">
					Define how the event repeats (daily, weekly, monthly, etc.). Leave
					empty for a one-time event.
				</p>
			</div>
			{formData.rrule?.trim() ? (
				<>
					<div className="space-y-2">
						<div className="mb-2 flex items-center gap-2">
							<CalendarPlus className="h-4 w-4 text-muted-foreground" />
							<Label>Additional dates</Label>
						</div>
						<DateListPicker
							dates={rdateList}
							onChange={(dates) => {
								onRdateChange(dates);
								onChange({ rdate: stringifyDateArray(dates) });
							}}
							disabled={isSubmitting}
							label=""
							placeholder="Add an additional date"
						/>
						<p className="text-muted-foreground text-xs">
							Add additional dates where the event should occur, in addition to
							those defined by the recurrence rule. Useful for adding
							exceptional occurrences.
						</p>
					</div>
					<div className="space-y-2">
						<div className="mb-2 flex items-center gap-2">
							<CalendarX className="h-4 w-4 text-muted-foreground" />
							<Label>Exception dates</Label>
						</div>
						<DateListPicker
							dates={exdateList}
							onChange={(dates) => {
								onExdateChange(dates);
								onChange({ exdate: stringifyDateArray(dates) });
							}}
							disabled={isSubmitting}
							label=""
							placeholder="Add an exception date"
						/>
						<p className="text-muted-foreground text-xs">
							Exclude specific dates from the recurrence. For example, if your
							event repeats every Monday but you want to exclude a particular
							Monday.
						</p>
					</div>
				</>
			) : (
				<div className="flex items-start gap-3 rounded-md border border-muted bg-muted/50 p-4">
					<Repeat className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
					<p className="text-muted-foreground text-sm">
						Additional and exception dates are only available when a recurrence
						rule is defined. First define a recurrence rule above.
					</p>
				</div>
			)}
		</div>
	);
}
