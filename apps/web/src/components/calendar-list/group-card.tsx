/**
 * Calendar Group Card Component
 * Displays a group of calendars with actions (merge, export, share, edit, delete)
 */

import {
	Download,
	Edit,
	Folder,
	GitMerge,
	Link2,
	MoreHorizontal,
	Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CalendarGroupCardProps {
	group: {
		id: string;
		name: string;
		description?: string | null;
		color?: string | null;
		calendarCount: number;
	};
	onOpen: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onMerge: () => void;
	onExport: () => void;
	onShare: () => void;
	isDeleting?: boolean;
}

export function CalendarGroupCard({
	group,
	onOpen,
	onEdit,
	onDelete,
	onMerge,
	onExport,
	onShare,
	isDeleting = false,
}: CalendarGroupCardProps) {
	return (
		<Card
			className={cn(
				"group relative cursor-pointer overflow-hidden transition-all duration-200",
				"hover:border-primary/30 hover:shadow-lg",
			)}
			onClick={onOpen}
		>
			{/* Color accent - left border */}
			<div
				className="absolute inset-y-0 left-0 w-1 transition-all duration-200 group-hover:w-1.5"
				style={{ backgroundColor: group.color || "#8b5cf6" }}
			/>

			<CardHeader className="pb-2 pl-6">
				<div className="flex items-start justify-between">
					<div className="min-w-0 flex-1 pr-8">
						<div className="flex items-center gap-2">
							<Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
							<CardTitle className="line-clamp-1 text-card-title">
								{group.name}
							</CardTitle>
						</div>
						<CardDescription className="mt-1.5">
							{group.description ? (
								<span className="line-clamp-2">{group.description}</span>
							) : (
								<span>
									{group.calendarCount} calendar
									{group.calendarCount !== 1 ? "s" : ""}
								</span>
							)}
							{group.description && (
								<span className="ml-2 text-muted-foreground/70">
									• {group.calendarCount} calendar
									{group.calendarCount !== 1 ? "s" : ""}
								</span>
							)}
						</CardDescription>
					</div>

					{/* Actions Menu */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="absolute top-2 right-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreHorizontal className="h-4 w-4" />
								<span className="sr-only">More options</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							onClick={(e) => e.stopPropagation()}
						>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onOpen();
								}}
							>
								<Folder className="mr-2 h-4 w-4" />
								View group
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onShare();
								}}
							>
								<Link2 className="mr-2 h-4 w-4" />
								Share
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onExport();
								}}
							>
								<Download className="mr-2 h-4 w-4" />
								Export
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onMerge();
								}}
							>
								<GitMerge className="mr-2 h-4 w-4" />
								Merge
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onEdit();
								}}
							>
								<Edit className="mr-2 h-4 w-4" />
								Edit
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={(e) => {
									e.stopPropagation();
									onDelete();
								}}
								className="text-destructive focus:text-destructive"
								disabled={isDeleting}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>

			<CardContent className="pl-5">
				<Button
					variant="outline"
					size="sm"
					className="w-full"
					onClick={(e) => {
						e.stopPropagation();
						onOpen();
					}}
				>
					View calendars
				</Button>
			</CardContent>
		</Card>
	);
}
