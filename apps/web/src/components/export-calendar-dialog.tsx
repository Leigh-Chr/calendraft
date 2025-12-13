import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
	Calendar as CalendarIcon,
	Download,
	Filter,
	Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trpcClient } from "@/utils/trpc";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface ExportCalendarDialogProps {
	calendarId: string;
	calendarName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type DateRange = {
	from?: Date;
	to?: Date;
};

export function ExportCalendarDialog({
	calendarId,
	calendarName,
	open,
	onOpenChange,
}: ExportCalendarDialogProps) {
	const [isExporting, setIsExporting] = useState(false);
	const [dateRange, setDateRange] = useState<DateRange>({});
	const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
		new Set(),
	);
	const [futureOnly, setFutureOnly] = useState(false);

	// Get unique categories from calendar events
	const { data: calendarData } = useQuery({
		queryKey: ["calendar", "export-categories", calendarId],
		queryFn: async () => {
			// Fetch calendar to get categories
			return trpcClient.calendar.getById.query({ id: calendarId });
		},
		enabled: open,
	});

	// Extract unique categories
	// React Compiler will automatically memoize these callbacks
	const normalizeCategory = (c: string | { category: string }) => {
		return typeof c === "string" ? c : c.category;
	};

	const extractCategories = (events: Array<{ categories?: unknown }>) => {
		if (!events) return [];
		const categories = new Set<string>();
		for (const event of events) {
			if (!event.categories || !Array.isArray(event.categories)) continue;
			for (const cat of event.categories.map(normalizeCategory)) {
				if (cat) categories.add(cat);
			}
		}
		return Array.from(categories).sort();
	};

	// React Compiler will automatically memoize this computation
	const availableCategories = (() => {
		if (!calendarData?.events) return [];
		return extractCategories(calendarData.events);
	})();

	// Toggle category selection
	const toggleCategory = (category: string) => {
		setSelectedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(category)) {
				next.delete(category);
			} else {
				next.add(category);
			}
			return next;
		});
	};

	// Export handler
	const handleExport = async () => {
		setIsExporting(true);
		try {
			const data = await trpcClient.calendar.exportIcs.query({
				id: calendarId,
				dateFrom: dateRange.from?.toISOString(),
				dateTo: dateRange.to?.toISOString(),
				categories:
					selectedCategories.size > 0
						? Array.from(selectedCategories)
						: undefined,
				futureOnly: futureOnly || undefined,
			});

			// Download the ICS file
			const blob = new Blob([data.icsContent], { type: "text/calendar" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;

			// Build filename with filters info
			let filename = data.calendarName;
			if (futureOnly) {
				filename += "_futur";
			} else if (dateRange.from || dateRange.to) {
				filename += "_filtre";
			}
			filename += ".ics";

			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("Calendar exported successfully");
			onOpenChange(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Error during export";
			toast.error(message);
		} finally {
			setIsExporting(false);
		}
	};

	// Quick export (no filters)
	const handleQuickExport = async () => {
		setIsExporting(true);
		try {
			const data = await trpcClient.calendar.exportIcs.query({
				id: calendarId,
			});

			const blob = new Blob([data.icsContent], { type: "text/calendar" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${data.calendarName}.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("Calendar exported successfully");
			onOpenChange(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Error during export";
			toast.error(message);
		} finally {
			setIsExporting(false);
		}
	};

	// Clear all filters
	const clearFilters = () => {
		setDateRange({});
		setSelectedCategories(new Set());
		setFutureOnly(false);
	};

	const hasFilters =
		dateRange.from || dateRange.to || selectedCategories.size > 0 || futureOnly;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Download className="h-5 w-5" />
						Export « {calendarName} »
					</DialogTitle>
					<DialogDescription>
						Export the entire calendar or apply filters to export only a portion
						of the events.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Quick export button */}
					<Button
						variant="outline"
						className="w-full justify-start"
						onClick={handleQuickExport}
						disabled={isExporting}
					>
						{isExporting ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<Download className="mr-2 h-4 w-4" />
						)}
						Export entire calendar
					</Button>

					<div className="flex items-center gap-2">
						<div className="h-px flex-1 bg-border" />
						<span className="text-muted-foreground text-xs">or</span>
						<div className="h-px flex-1 bg-border" />
					</div>

					{/* Filters section */}
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label className="flex items-center gap-2 font-medium text-sm">
								<Filter className="h-4 w-4" />
								Filters
							</Label>
							{hasFilters && (
								<Button
									variant="ghost"
									size="sm"
									onClick={clearFilters}
									className="h-auto px-2 py-1 text-xs"
								>
									Clear filters
								</Button>
							)}
						</div>

						{/* Future only toggle */}
						<div className="flex items-center gap-2">
							<Checkbox
								id="future-only"
								checked={futureOnly}
								onCheckedChange={(checked) => setFutureOnly(checked === true)}
							/>
							<Label htmlFor="future-only" className="text-sm">
								Future events only
							</Label>
						</div>

						{/* Date range picker */}
						{!futureOnly && (
							<div className="space-y-2">
								<Label className="text-sm">Period</Label>
								<div className="flex gap-2">
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													"flex-1 justify-start text-left font-normal",
													!dateRange.from && "text-muted-foreground",
												)}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{dateRange.from
													? format(dateRange.from, "d MMM yyyy", {
															locale: enUS,
														})
													: "Start date"}
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-auto"
											align="start"
										>
											<Calendar
												mode="single"
												selected={dateRange.from}
												onSelect={(date) =>
													setDateRange((prev) => ({ ...prev, from: date }))
												}
												locale={enUS}
											/>
										</PopoverContent>
									</Popover>
									<Popover>
										<PopoverTrigger asChild>
											<Button
												variant="outline"
												className={cn(
													"flex-1 justify-start text-left font-normal",
													!dateRange.to && "text-muted-foreground",
												)}
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{dateRange.to
													? format(dateRange.to, "d MMM yyyy", { locale: enUS })
													: "End date"}
											</Button>
										</PopoverTrigger>
										<PopoverContent
											className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-auto"
											align="start"
										>
											<Calendar
												mode="single"
												selected={dateRange.to}
												onSelect={(date) =>
													setDateRange((prev) => ({ ...prev, to: date }))
												}
												locale={enUS}
											/>
										</PopoverContent>
									</Popover>
								</div>
							</div>
						)}

						{/* Categories filter */}
						{availableCategories.length > 0 && (
							<div className="space-y-2">
								<Label className="text-sm">Categories</Label>
								<div className="flex flex-wrap gap-2">
									{availableCategories.map((category) => (
										<Badge
											key={category}
											variant={
												selectedCategories.has(category) ? "default" : "outline"
											}
											className="min-h-[44px] cursor-pointer px-3 py-2 sm:min-h-0 sm:px-2 sm:py-0.5"
											onClick={() => toggleCategory(category)}
										>
											{category}
										</Badge>
									))}
								</div>
								{selectedCategories.size > 0 && (
									<p className="text-muted-foreground text-xs">
										{selectedCategories.size} categor
										{selectedCategories.size !== 1 ? "ies" : "y"} selected
									</p>
								)}
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleExport} disabled={isExporting || !hasFilters}>
						{isExporting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Export...
							</>
						) : (
							<>
								<Download className="mr-2 h-4 w-4" />
								Export with filters
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
