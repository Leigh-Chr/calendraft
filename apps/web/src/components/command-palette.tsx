/**
 * Command Palette - Quick navigation and actions via Cmd+K
 * Inspired by Notion, Linear, Figma
 */

import { useNavigate } from "@tanstack/react-router";
import {
	Calendar,
	FileUp,
	GitMerge,
	Home,
	Moon,
	Plus,
	Search,
	Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { useCalendars } from "@/hooks/use-storage";

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

type CommandAction = {
	id: string;
	label: string;
	icon: React.ReactNode;
	shortcut?: string;
	action: () => void;
	keywords?: string[];
	group: "navigation" | "actions" | "calendars" | "settings";
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
	const navigate = useNavigate();
	const { calendars } = useCalendars();
	const { theme, setTheme } = useTheme();
	const [search, setSearch] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	// Reset search when closing
	useEffect(() => {
		if (!open) {
			setSearch("");
		}
	}, [open]);

	const closeAndNavigate = useCallback(
		(to: string) => {
			onOpenChange(false);
			navigate({ to });
		},
		[navigate, onOpenChange],
	);

	const closeAndAction = useCallback(
		(action: () => void) => {
			onOpenChange(false);
			action();
		},
		[onOpenChange],
	);

	// Define all available commands
	const commands: CommandAction[] = useMemo(
		() => [
			// Navigation
			{
				id: "home",
				label: "Home",
				icon: <Home className="h-4 w-4" />,
				shortcut: "G H",
				action: () => closeAndNavigate("/"),
				keywords: ["home", "landing"],
				group: "navigation",
			},
			{
				id: "calendars",
				label: "My calendars",
				icon: <Calendar className="h-4 w-4" />,
				shortcut: "G C",
				action: () => closeAndNavigate("/calendars"),
				keywords: ["calendars", "list"],
				group: "navigation",
			},
			// Actions
			{
				id: "new-calendar",
				label: "New calendar",
				icon: <Plus className="h-4 w-4" />,
				shortcut: "N",
				action: () => closeAndNavigate("/calendars/new"),
				keywords: ["new", "create", "calendar"],
				group: "actions",
			},
			{
				id: "import",
				label: "Import calendar",
				icon: <FileUp className="h-4 w-4" />,
				shortcut: "I",
				action: () => closeAndNavigate("/calendars/import"),
				keywords: ["import", "ics", "file", "upload"],
				group: "actions",
			},
			{
				id: "merge",
				label: "Merge calendars",
				icon: <GitMerge className="h-4 w-4" />,
				shortcut: "M",
				action: () => closeAndNavigate("/calendars/merge"),
				keywords: ["merge", "combine", "calendars"],
				group: "actions",
			},

			// Settings
			{
				id: "toggle-theme",
				label: theme === "dark" ? "Light mode" : "Dark mode",
				icon:
					theme === "dark" ? (
						<Sun className="h-4 w-4" />
					) : (
						<Moon className="h-4 w-4" />
					),
				action: () =>
					closeAndAction(() => setTheme(theme === "dark" ? "light" : "dark")),
				keywords: ["theme", "dark", "light", "mode"],
				group: "settings",
			},

			// Individual calendars
			...calendars.map((calendar) => ({
				id: `calendar-${calendar.id}`,
				label: calendar.name,
				icon: (
					<div
						className="h-3 w-3 rounded-full"
						style={{ backgroundColor: calendar.color || "#D4A017" }}
					/>
				),
				action: () => closeAndNavigate(`/calendars/${calendar.id}`),
				keywords: [
					calendar.name.toLowerCase(),
					"calendar",
					`${calendar.eventCount} events`,
				],
				group: "calendars" as const,
			})),
		],
		[calendars, theme, closeAndNavigate, closeAndAction, setTheme],
	);

	// Group commands
	const navigationCommands = commands.filter((c) => c.group === "navigation");
	const actionCommands = commands.filter((c) => c.group === "actions");
	const calendarCommands = commands.filter((c) => c.group === "calendars");
	const settingsCommands = commands.filter((c) => c.group === "settings");

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandInput
				ref={inputRef}
				placeholder="Search or type a command..."
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>
					<div className="py-6 text-center">
						<Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							No results for "{search}"
						</p>
					</div>
				</CommandEmpty>

				{/* Quick actions */}
				{actionCommands.length > 0 && (
					<CommandGroup heading="Quick actions">
						{actionCommands.map((command) => (
							<CommandItem
								key={command.id}
								value={`${command.label} ${command.keywords?.join(" ")}`}
								onSelect={command.action}
							>
								{command.icon}
								<span className="ml-2">{command.label}</span>
								{command.shortcut && (
									<CommandShortcut>{command.shortcut}</CommandShortcut>
								)}
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{/* Calendars */}
				{calendarCommands.length > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Calendars">
							{calendarCommands.map((command) => (
								<CommandItem
									key={command.id}
									value={`${command.label} ${command.keywords?.join(" ")}`}
									onSelect={command.action}
								>
									{command.icon}
									<span className="ml-2">{command.label}</span>
								</CommandItem>
							))}
						</CommandGroup>
					</>
				)}

				{/* Navigation */}
				<CommandSeparator />
				<CommandGroup heading="Navigation">
					{navigationCommands.map((command) => (
						<CommandItem
							key={command.id}
							value={`${command.label} ${command.keywords?.join(" ")}`}
							onSelect={command.action}
						>
							{command.icon}
							<span className="ml-2">{command.label}</span>
							{command.shortcut && (
								<CommandShortcut>{command.shortcut}</CommandShortcut>
							)}
						</CommandItem>
					))}
				</CommandGroup>

				{/* Settings */}
				<CommandSeparator />
				<CommandGroup heading="Settings">
					{settingsCommands.map((command) => (
						<CommandItem
							key={command.id}
							value={`${command.label} ${command.keywords?.join(" ")}`}
							onSelect={command.action}
						>
							{command.icon}
							<span className="ml-2">{command.label}</span>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>

			{/* Footer with help */}
			<div className="border-t px-3 py-2">
				<div className="flex flex-col items-start justify-between gap-2 text-muted-foreground text-xs sm:flex-row sm:items-center sm:gap-0">
					<div className="flex flex-wrap items-center gap-2 sm:gap-3">
						<span>
							<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								↑↓
							</kbd>{" "}
							navigate
						</span>
						<span>
							<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								↵
							</kbd>{" "}
							select
						</span>
						<span>
							<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								esc
							</kbd>{" "}
							close
						</span>
					</div>
				</div>
			</div>
		</CommandDialog>
	);
}

/**
 * Hook to open/close the Command Palette
 */
export function useCommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const down = (e: KeyboardEvent): void => {
			// Cmd+K or Ctrl+K
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	return { open, setOpen };
}
