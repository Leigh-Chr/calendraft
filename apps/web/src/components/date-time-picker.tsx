import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
	value: string; // Format: "YYYY-MM-DDTHH:mm"
	onChange: (value: string) => void;
	disabled?: boolean;
	id?: string;
	required?: boolean;
	placeholder?: string;
	"aria-label"?: string;
}

/**
 * DateTimePicker component - More intuitive than native datetime-local input
 * Uses Calendar popover + time input for better UX
 */
export function DateTimePicker({
	value,
	onChange,
	disabled = false,
	id,
	required = false,
	placeholder = "Sélectionner date et heure",
	"aria-label": ariaLabel,
}: DateTimePickerProps) {
	const [open, setOpen] = useState(false);

	// Parse the datetime-local format (YYYY-MM-DDTHH:mm)
	const date = value ? new Date(value) : undefined;
	const timeValue = date ? format(date, "HH:mm") : "";

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (!selectedDate) return;

		// Keep existing time or use current time
		const [hours, minutes] = timeValue
			? timeValue.split(":").map(Number)
			: [new Date().getHours(), 0];
		selectedDate.setHours(hours, minutes, 0, 0);

		// Format as datetime-local string
		const year = selectedDate.getFullYear();
		const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
		const day = String(selectedDate.getDate()).padStart(2, "0");
		const hoursStr = String(hours).padStart(2, "0");
		const minutesStr = String(minutes).padStart(2, "0");

		onChange(`${year}-${month}-${day}T${hoursStr}:${minutesStr}`);

		// Close popover if time is already set, otherwise keep it open for time selection
		if (timeValue) {
			setOpen(false);
		}
	};

	const handleTimeChange = (time: string) => {
		if (!date) return;

		const [hours, minutes] = time.split(":").map(Number);
		const newDate = new Date(date);
		newDate.setHours(hours || 0, minutes || 0, 0, 0);

		// Format as datetime-local string
		const year = newDate.getFullYear();
		const month = String(newDate.getMonth() + 1).padStart(2, "0");
		const day = String(newDate.getDate()).padStart(2, "0");
		const hoursStr = String(hours || 0).padStart(2, "0");
		const minutesStr = String(minutes || 0).padStart(2, "0");

		onChange(`${year}-${month}-${day}T${hoursStr}:${minutesStr}`);

		// Close popover after time is set
		if (time) {
			setOpen(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!date && "text-muted-foreground",
					)}
					disabled={disabled}
					id={id}
					aria-required={required}
					aria-label={ariaLabel}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date ? (
						format(date, "PPP 'à' HH:mm", { locale: fr })
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="space-y-4 p-4">
					<Calendar
						mode="single"
						selected={date}
						onSelect={handleDateSelect}
						disabled={disabled}
						initialFocus
					/>
					<div className="space-y-2 border-t pt-4">
						<Label htmlFor={`${id}-time`} className="flex items-center gap-2">
							<Clock className="h-4 w-4" />
							Heure
						</Label>
						<Input
							id={`${id}-time`}
							type="time"
							value={timeValue}
							onChange={(e) => handleTimeChange(e.target.value)}
							disabled={disabled || !date}
							className="w-full"
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
