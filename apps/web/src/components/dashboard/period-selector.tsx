import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const PERIOD_OPTIONS = [
	{ value: "today", label: "Today" },
	{ value: "week", label: "This week" },
	{ value: "month", label: "This month" },
	{ value: "year", label: "This year" },
] as const;

interface PeriodSelectorProps {
	value: string;
	onChange: (value: string) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className="w-[160px]">
				<SelectValue placeholder="Select period" />
			</SelectTrigger>
			<SelectContent>
				{PERIOD_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
