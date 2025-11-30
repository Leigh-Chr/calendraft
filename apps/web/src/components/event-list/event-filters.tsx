/**
 * Event list filter components
 */

import { Search } from "lucide-react";
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
import type { FilterState } from "./types";

// ----- Date Filter Buttons -----

interface DateFilterButtonsProps {
	currentFilter: FilterState["dateFilter"];
	onFilterChange: (filter: FilterState["dateFilter"]) => void;
}

const DATE_FILTER_LABELS = {
	all: "Tout",
	today: "Aujourd'hui",
	week: "Cette semaine",
	month: "Ce mois",
} as const;

export const DateFilterButtons = React.memo(function DateFilterButtons({
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
});

// ----- Search and Sort Bar -----

interface SearchSortBarProps {
	keyword: string;
	sortBy: FilterState["sortBy"];
	onKeywordChange: (keyword: string) => void;
	onSortChange: (sortBy: FilterState["sortBy"]) => void;
}

export const SearchSortBar = React.memo(function SearchSortBar({
	keyword,
	sortBy,
	onKeywordChange,
	onSortChange,
}: SearchSortBarProps) {
	return (
		<div className="flex gap-2">
			<div className="flex-1">
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Rechercher un événement..."
						value={keyword}
						onChange={(e) => onKeywordChange(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>
			<Select
				value={sortBy}
				onValueChange={(v) => onSortChange(v as FilterState["sortBy"])}
			>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="Trier par" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="date">Date</SelectItem>
					<SelectItem value="name">Nom</SelectItem>
					<SelectItem value="duration">Durée</SelectItem>
				</SelectContent>
			</Select>
		</div>
	);
});
