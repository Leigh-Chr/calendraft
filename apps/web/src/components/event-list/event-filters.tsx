/**
 * Event list filter components
 */

// React Compiler will automatically memoize these components
import { useIsMobile } from "@calendraft/react-utils";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FilterState } from "./types";

// ----- Date Filter Buttons -----

interface DateFilterButtonsProps {
	currentFilter: FilterState["dateFilter"];
	onFilterChange: (filter: FilterState["dateFilter"]) => void;
}

const DATE_FILTER_LABELS = {
	all: "All",
	today: "Today",
	week: "This week",
	month: "This month",
} as const;

export function DateFilterButtons({
	currentFilter,
	onFilterChange,
}: DateFilterButtonsProps) {
	return (
		<div className="flex flex-wrap gap-2">
			{(Object.keys(DATE_FILTER_LABELS) as FilterState["dateFilter"][]).map(
				(filter) => (
					<Button
						key={filter}
						variant={currentFilter === filter ? "default" : "outline"}
						size="sm"
						onClick={() => onFilterChange(filter)}
					>
						{DATE_FILTER_LABELS[filter]}
					</Button>
				),
			)}
		</div>
	);
}

// ----- Search and Sort Bar -----

interface SearchSortBarProps {
	keyword: string;
	sortBy: FilterState["sortBy"];
	sortDirection: FilterState["sortDirection"];
	onKeywordChange: (keyword: string) => void;
	onSortChange: (sortBy: FilterState["sortBy"]) => void;
	onSortDirectionChange: (sortDirection: FilterState["sortDirection"]) => void;
}

export function SearchSortBar({
	keyword,
	sortBy,
	sortDirection,
	onKeywordChange,
	onSortChange,
	onSortDirectionChange,
}: SearchSortBarProps) {
	const isMobile = useIsMobile();
	// Only show direction toggle for "date" sort
	const showDirectionToggle = sortBy === "date";

	const handleDirectionToggle = () => {
		onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
	};

	return (
		<div className={isMobile ? "flex flex-col gap-2" : "flex gap-2"}>
			<div className="flex-1">
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search events (title, description, location)..."
						value={keyword}
						onChange={(e) => onKeywordChange(e.target.value)}
						className="pr-9 pl-9"
						aria-label="Search events by title, description, or location"
					/>
					{keyword && (
						<Button
							variant="ghost"
							size="icon"
							className="-translate-y-1/2 absolute top-1/2 right-1 h-10 min-h-[44px] w-10 sm:h-6 sm:min-h-0 sm:w-6"
							onClick={() => onKeywordChange("")}
							aria-label="Clear search"
						>
							<X className="h-4 w-4 sm:h-3 sm:w-3" />
						</Button>
					)}
				</div>
			</div>
			<div className={isMobile ? "flex gap-2" : "flex items-center gap-2"}>
				<Select
					value={sortBy}
					onValueChange={(v) => onSortChange(v as FilterState["sortBy"])}
				>
					<SelectTrigger className={isMobile ? "w-full" : "w-[180px]"}>
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="date">Date</SelectItem>
						<SelectItem value="name">Name A-Z</SelectItem>
						<SelectItem value="duration">Duration</SelectItem>
					</SelectContent>
				</Select>
				{showDirectionToggle && (
					<Button
						variant="outline"
						size="icon"
						onClick={handleDirectionToggle}
						className={isMobile ? "w-10 flex-shrink-0" : "w-[40px]"}
						aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
						title={
							sortDirection === "asc" ? "Sort ascending" : "Sort descending"
						}
					>
						{sortDirection === "asc" ? (
							<ArrowUp className="h-4 w-4" />
						) : (
							<ArrowDown className="h-4 w-4" />
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
