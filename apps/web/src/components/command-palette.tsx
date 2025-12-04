/**
 * Command Palette - Navigation et actions rapides via Cmd+K
 * Inspiré de Notion, Linear, Figma
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
				label: "Accueil",
				icon: <Home className="h-4 w-4" />,
				shortcut: "G H",
				action: () => closeAndNavigate("/"),
				keywords: ["home", "landing", "accueil"],
				group: "navigation",
			},
			{
				id: "calendars",
				label: "Mes calendriers",
				icon: <Calendar className="h-4 w-4" />,
				shortcut: "G C",
				action: () => closeAndNavigate("/calendars"),
				keywords: ["calendars", "list", "tous", "calendriers"],
				group: "navigation",
			},
			// Actions
			{
				id: "new-calendar",
				label: "Nouveau calendrier",
				icon: <Plus className="h-4 w-4" />,
				shortcut: "N",
				action: () => closeAndNavigate("/calendars/new"),
				keywords: ["new", "create", "nouveau", "créer", "calendrier"],
				group: "actions",
			},
			{
				id: "import",
				label: "Importer un .ics",
				icon: <FileUp className="h-4 w-4" />,
				shortcut: "I",
				action: () => closeAndNavigate("/calendars/import"),
				keywords: ["import", "importer", "ics", "fichier", "upload"],
				group: "actions",
			},
			{
				id: "merge",
				label: "Fusionner des calendriers",
				icon: <GitMerge className="h-4 w-4" />,
				shortcut: "M",
				action: () => closeAndNavigate("/calendars/merge"),
				keywords: ["merge", "fusionner", "combiner", "calendriers"],
				group: "actions",
			},

			// Settings
			{
				id: "toggle-theme",
				label: theme === "dark" ? "Mode clair" : "Mode sombre",
				icon:
					theme === "dark" ? (
						<Sun className="h-4 w-4" />
					) : (
						<Moon className="h-4 w-4" />
					),
				action: () =>
					closeAndAction(() => setTheme(theme === "dark" ? "light" : "dark")),
				keywords: ["theme", "dark", "light", "sombre", "clair", "mode"],
				group: "settings",
			},

			// Individual calendars
			...calendars.map((calendar) => ({
				id: `calendar-${calendar.id}`,
				label: calendar.name,
				icon: (
					<div
						className="h-3 w-3 rounded-full"
						style={{ backgroundColor: calendar.color || "#6366f1" }}
					/>
				),
				action: () => closeAndNavigate(`/calendars/${calendar.id}`),
				keywords: [
					calendar.name.toLowerCase(),
					"calendrier",
					`${calendar.eventCount} événements`,
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
				placeholder="Rechercher ou taper une commande..."
				value={search}
				onValueChange={setSearch}
			/>
			<CommandList>
				<CommandEmpty>
					<div className="py-6 text-center">
						<Search className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
						<p className="text-muted-foreground text-sm">
							Aucun résultat pour "{search}"
						</p>
					</div>
				</CommandEmpty>

				{/* Actions rapides */}
				{actionCommands.length > 0 && (
					<CommandGroup heading="Actions rapides">
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

				{/* Calendriers */}
				{calendarCommands.length > 0 && (
					<>
						<CommandSeparator />
						<CommandGroup heading="Calendriers">
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

				{/* Paramètres */}
				<CommandSeparator />
				<CommandGroup heading="Paramètres">
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

			{/* Footer avec aide */}
			<div className="border-t px-3 py-2">
				<div className="flex items-center justify-between text-muted-foreground text-xs">
					<div className="flex items-center gap-3">
						<span>
							<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								↑↓
							</kbd>{" "}
							naviguer
						</span>
						<span>
							<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								↵
							</kbd>{" "}
							sélectionner
						</span>
						<span>
							<kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
								esc
							</kbd>{" "}
							fermer
						</span>
					</div>
				</div>
			</div>
		</CommandDialog>
	);
}

/**
 * Hook pour ouvrir/fermer le Command Palette
 */
export function useCommandPalette() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			// Cmd+K ou Ctrl+K
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
