import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface DateListPickerProps {
	dates: Date[];
	onChange: (dates: Date[]) => void;
	disabled?: boolean;
	label?: string;
	placeholder?: string;
}

export function DateListPicker({
	dates,
	onChange,
	disabled = false,
	label,
	placeholder = "Add a date",
}: DateListPickerProps) {
	const [open, setOpen] = useState(false);
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
	const [selectedTime, setSelectedTime] = useState("10:00");

	const handleAddDate = () => {
		if (selectedDate) {
			// Combine date and time
			const newDate = new Date(selectedDate);
			const [hours, minutes] = selectedTime.split(":").map(Number);
			newDate.setHours(hours || 0, minutes || 0, 0, 0);

			// Check if date already exists (same day)
			const exists = dates.some(
				(d) =>
					d.getFullYear() === newDate.getFullYear() &&
					d.getMonth() === newDate.getMonth() &&
					d.getDate() === newDate.getDate(),
			);

			if (!exists) {
				onChange([...dates, newDate].sort((a, b) => a.getTime() - b.getTime()));
			}

			setSelectedDate(undefined);
			setSelectedTime("10:00");
			setOpen(false);
		}
	};

	const handleRemoveDate = (index: number) => {
		onChange(dates.filter((_, i) => i !== index));
	};

	return (
		<div className="space-y-2">
			{label && <Label>{label}</Label>}
			<div className="space-y-2">
				{/* Date list */}
				<div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded-md border p-2">
					{dates.map((date, index) => (
						<Badge
							key={`${date.getTime()}-${index}`}
							variant="secondary"
							className="flex items-center gap-1"
						>
							{format(date, "dd MMM yyyy, HH:mm", { locale: enUS })}
							<button
								type="button"
								onClick={() => handleRemoveDate(index)}
								disabled={disabled}
								className="ml-1 min-h-[44px] rounded-full p-1.5 transition-colors hover:bg-destructive/20 sm:min-h-0 sm:p-0.5"
								aria-label={`Remove date ${format(date, "dd MMM yyyy, HH:mm", { locale: enUS })}`}
							>
								<X className="h-4 w-4 sm:h-3 sm:w-3" />
							</button>
						</Badge>
					))}
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="outline"
								size="sm"
								disabled={disabled}
							>
								<CalendarIcon className="mr-2 h-4 w-4" />
								{placeholder}
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-auto"
							align="start"
						>
							<div className="space-y-4 p-4">
								<Calendar
									mode="single"
									selected={selectedDate}
									onSelect={setSelectedDate}
									disabled={disabled}
									initialFocus
								/>
								<div className="space-y-2">
									<Label htmlFor="time">Time</Label>
									<Input
										id="time"
										type="time"
										value={selectedTime}
										onChange={(e) => setSelectedTime(e.target.value)}
										disabled={disabled}
									/>
								</div>
								<Button
									type="button"
									onClick={handleAddDate}
									disabled={!selectedDate || disabled}
									className="w-full"
								>
									Add
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
				<p className="text-muted-foreground text-xs">
					Click "Add a date" to select a date and time
				</p>
			</div>
		</div>
	);
}
