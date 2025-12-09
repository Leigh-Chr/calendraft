/**
 * Calendar list filter components
 * Reusable search and sort components for calendar lists
 */

import { ArrowDown, ArrowUp, Search, X } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Search Bar (standalone, for simple search-only use cases)
// ============================================================================

interface SearchBarProps {
	keyword: string;
	onKeywordChange: (keyword: string) => void;
	placeholder?: string;
	ariaLabel?: string;
}

export const SearchBar = React.memo(function SearchBar({
	keyword,
	onKeywordChange,
	placeholder = "Search calendars...",
	ariaLabel = "Search calendars",
}: SearchBarProps) {
	return (
		<div className="flex-1">
			<div className="relative">
				<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder={placeholder}
					value={keyword}
					onChange={(e) => onKeywordChange(e.target.value)}
					className="pr-9 pl-9"
					aria-label={ariaLabel}
				/>
				{keyword && (
					<Button
						variant="ghost"
						size="icon"
						className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
						onClick={() => onKeywordChange("")}
						aria-label="Clear search"
					>
						<X className="h-3 w-3" />
					</Button>
				)}
			</div>
		</div>
	);
});

// ============================================================================
// Search and Sort Bar (for pages with both search and sort)
// ============================================================================

export type CalendarSortBy = "name" | "updatedAt" | "createdAt" | "eventCount";
export type CalendarSortDirection = "asc" | "desc";

interface SearchSortBarProps {
	keyword: string;
	sortBy: CalendarSortBy;
	sortDirection?: CalendarSortDirection;
	onKeywordChange: (keyword: string) => void;
	onSortChange: (sortBy: CalendarSortBy) => void;
	onSortDirectionChange?: (sortDirection: CalendarSortDirection) => void;
	/** Show sort direction toggle (only for date-based sorts) */
	showDirectionToggle?: boolean;
	/** Custom sort options (defaults to all options) */
	sortOptions?: Array<{ value: CalendarSortBy; label: string }>;
}

const DEFAULT_SORT_OPTIONS: Array<{ value: CalendarSortBy; label: string }> = [
	{ value: "name", label: "Name A-Z" },
	{ value: "updatedAt", label: "Last updated" },
	{ value: "createdAt", label: "Date created" },
	{ value: "eventCount", label: "Event count" },
];

export const CalendarSearchSortBar = React.memo(function CalendarSearchSortBar({
	keyword,
	sortBy,
	sortDirection = "desc",
	onKeywordChange,
	onSortChange,
	onSortDirectionChange,
	showDirectionToggle = false,
	sortOptions = DEFAULT_SORT_OPTIONS,
	id,
}: SearchSortBarProps) {
	const handleDirectionToggle = () => {
		if (onSortDirectionChange) {
			onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc");
		}
	};

	return (
		<div id={id} className="flex gap-2">
			<div className="flex-1">
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search calendars by name..."
						value={keyword}
						onChange={(e) => onKeywordChange(e.target.value)}
						className="pr-9 pl-9"
						aria-label="Search calendars by name"
					/>
					{keyword && (
						<Button
							variant="ghost"
							size="icon"
							className="-translate-y-1/2 absolute top-1/2 right-1 h-6 w-6"
							onClick={() => onKeywordChange("")}
							aria-label="Clear search"
						>
							<X className="h-3 w-3" />
						</Button>
					)}
				</div>
			</div>
			<Select
				value={sortBy}
				onValueChange={(v) => onSortChange(v as CalendarSortBy)}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Sort by" />
				</SelectTrigger>
				<SelectContent>
					{sortOptions.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{showDirectionToggle && onSortDirectionChange && (
				<Button
					variant="outline"
					size="icon"
					onClick={handleDirectionToggle}
					className="w-[40px]"
					aria-label={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
					title={sortDirection === "asc" ? "Sort ascending" : "Sort descending"}
				>
					{sortDirection === "asc" ? (
						<ArrowUp className="h-4 w-4" />
					) : (
						<ArrowDown className="h-4 w-4" />
					)}
				</Button>
			)}
		</div>
	);
});
