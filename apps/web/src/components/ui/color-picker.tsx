import { Check, Palette } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const PREDEFINED_COLORS = [
	{ name: "Rouge", value: "#EF4444" },
	{ name: "Orange", value: "#F97316" },
	{ name: "Jaune", value: "#EAB308" },
	{ name: "Vert", value: "#22C55E" },
	{ name: "Bleu", value: "#3B82F6" },
	{ name: "Indigo", value: "#6366F1" },
	{ name: "Violet", value: "#8B5CF6" },
	{ name: "Rose", value: "#EC4899" },
	{ name: "Cyan", value: "#06B6D4" },
	{ name: "Gris", value: "#6B7280" },
];

interface ColorPickerProps {
	value?: string | null;
	onChange: (color: string | null) => void;
	disabled?: boolean;
	showInput?: boolean;
	label?: string;
}

/**
 * Color picker component with predefined colors and optional custom input
 */
export function ColorPicker({
	value,
	onChange,
	disabled,
	showInput = true,
	label = "Couleur",
}: ColorPickerProps) {
	const [open, setOpen] = useState(false);

	return (
		<div className="space-y-2">
			{label && <Label>{label}</Label>}
			<div className="flex flex-wrap gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="w-auto"
							disabled={disabled}
							aria-label="Sélectionner une couleur prédéfinie"
						>
							{value ? (
								<div
									className="mr-2 h-4 w-4 rounded-full border"
									style={{ backgroundColor: value }}
								/>
							) : (
								<Palette className="mr-2 h-4 w-4" />
							)}
							{value || "Couleur"}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64">
						<div className="space-y-3">
							<Label className="font-medium text-xs">
								Couleurs prédéfinies
							</Label>
							<div className="grid grid-cols-5 gap-2">
								{PREDEFINED_COLORS.map((color) => (
									<button
										key={color.value}
										type="button"
										onClick={() => {
											onChange(color.value);
											setOpen(false);
										}}
										disabled={disabled}
										className={cn(
											"h-8 w-8 rounded-md border-2 transition-all hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
											value === color.value
												? "border-foreground ring-2 ring-offset-2"
												: "border-muted",
										)}
										style={{ backgroundColor: color.value }}
										aria-label={color.name}
										title={color.name}
									>
										{value === color.value && (
											<Check className="m-auto h-4 w-4 text-white drop-shadow-md" />
										)}
									</button>
								))}
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="w-full"
								onClick={() => {
									onChange(null);
									setOpen(false);
								}}
							>
								Aucune couleur
							</Button>
						</div>
					</PopoverContent>
				</Popover>
				{showInput && (
					<>
						<Input
							type="color"
							value={value || "#3B82F6"}
							onChange={(e) => onChange(e.target.value.toUpperCase())}
							disabled={disabled}
							className="h-10 w-14 cursor-pointer p-1"
							aria-label="Sélecteur de couleur personnalisée"
						/>
						<Input
							value={value || ""}
							onChange={(e) => {
								const val = e.target.value.toUpperCase();
								if (val === "" || /^#[0-9A-F]{0,6}$/i.test(val)) {
									onChange(val || null);
								}
							}}
							disabled={disabled}
							placeholder="#3B82F6"
							className="w-24"
							aria-label="Code couleur hexadécimal"
						/>
					</>
				)}
			</div>
		</div>
	);
}

/**
 * Compact color indicator for displaying calendar color
 */
export function ColorIndicator({
	color,
	size = "md",
	className,
}: {
	color?: string | null;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	if (!color) return null;

	const sizeClasses = {
		sm: "h-3 w-3",
		md: "h-4 w-4",
		lg: "h-5 w-5",
	};

	return (
		<div
			className={cn(
				"rounded-full border border-border/50",
				sizeClasses[size],
				className,
			)}
			style={{ backgroundColor: color }}
			title={`Couleur: ${color}`}
			role="img"
			aria-label={`Couleur: ${color}`}
		/>
	);
}
