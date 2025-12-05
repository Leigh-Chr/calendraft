import {
	AlertCircle,
	Check,
	CheckCircle2,
	Circle,
	Palette,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import type { EventFormData } from "@/lib/event-form-types";
import { FIELD_LIMITS } from "@/lib/field-limits";
import { cn } from "@/lib/utils";

interface MetadataSectionProps {
	formData: EventFormData;
	onChange: (data: Partial<EventFormData>) => void;
	isSubmitting: boolean;
}

/**
 * Color picker popover component with predefined colors
 */
function ColorPickerPopover({
	value,
	onChange,
	disabled,
}: {
	value?: string;
	onChange: (color: string) => void;
	disabled?: boolean;
}) {
	const [open, setOpen] = useState(false);

	const colors = [
		{ name: "Amber", value: "#C2703C" },
		{ name: "Orange", value: "#F97316" },
		{ name: "Red", value: "#EF4444" },
		{ name: "Yellow", value: "#EAB308" },
		{ name: "Green", value: "#22C55E" },
		{ name: "Blue", value: "#3B82F6" },
		{ name: "Purple", value: "#8B5CF6" },
		{ name: "Pink", value: "#EC4899" },
		{ name: "Gray", value: "#6B7280" },
		{ name: "Black", value: "#000000" },
	];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="w-auto"
					disabled={disabled}
					aria-label="Select a predefined color"
				>
					<Palette className="mr-2 h-4 w-4" />
					Colors
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64">
				<div className="space-y-2">
					<Label className="font-medium text-xs">Predefined colors</Label>
					<div className="grid grid-cols-6 gap-2">
						{colors.map((color) => (
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
				</div>
			</PopoverContent>
		</Popover>
	);
}

/**
 * Section for event metadata and organization
 */
export function MetadataSection({
	formData,
	onChange,
	isSubmitting,
}: MetadataSectionProps) {
	return (
		<div className="space-y-6">
			{/* Visual metadata */}
			<div className="space-y-4">
				<h4 className="mb-2 font-medium text-sm">Visual metadata</h4>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="status">Event status</Label>
						<Select
							value={formData.status || "none"}
							onValueChange={(value) =>
								onChange({ status: value === "none" ? undefined : value })
							}
							disabled={isSubmitting}
						>
							<SelectTrigger id="status">
								<SelectValue placeholder="Not defined" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">
									<div className="flex items-center gap-2">
										<Circle className="h-4 w-4 text-muted-foreground" />
										<span>Not defined</span>
									</div>
								</SelectItem>
								<SelectItem value="CONFIRMED">
									<div className="flex items-center gap-2">
										<CheckCircle2 className="h-4 w-4 text-green-600" />
										<span>Confirmed (the event will take place)</span>
									</div>
								</SelectItem>
								<SelectItem value="TENTATIVE">
									<div className="flex items-center gap-2">
										<AlertCircle className="h-4 w-4 text-orange-600" />
										<span>Tentative (may be cancelled or modified)</span>
									</div>
								</SelectItem>
								<SelectItem value="CANCELLED">
									<div className="flex items-center gap-2">
										<AlertCircle className="h-4 w-4 text-red-600" />
										<span>Cancelled (the event will not take place)</span>
									</div>
								</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Indicate if the event is confirmed, still uncertain, or cancelled.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="priority">Priority</Label>
						<RadioGroup
							value={formData.priority?.toString() || "0"}
							onValueChange={(value) =>
								onChange({
									priority: value === "0" ? undefined : Number(value),
								})
							}
							disabled={isSubmitting}
							id="priority"
							className="grid grid-cols-2 gap-3 md:grid-cols-4"
						>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="0" id="priority-none" />
								<Label
									htmlFor="priority-none"
									className="flex flex-1 cursor-pointer items-center gap-2 font-normal text-sm"
								>
									<Circle className="h-4 w-4 text-muted-foreground" />
									<span>Not defined</span>
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="2" id="priority-high" />
								<Label
									htmlFor="priority-high"
									className="flex flex-1 cursor-pointer items-center gap-2 font-normal text-sm"
								>
									<AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
									<span className="text-red-600 dark:text-red-400">High</span>
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="5" id="priority-medium" />
								<Label
									htmlFor="priority-medium"
									className="flex flex-1 cursor-pointer items-center gap-2 font-normal text-sm"
								>
									<Circle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
									<span className="text-orange-600 dark:text-orange-400">
										Medium
									</span>
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="8" id="priority-low" />
								<Label
									htmlFor="priority-low"
									className="flex flex-1 cursor-pointer items-center gap-2 font-normal text-sm"
								>
									<CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
									<span className="text-green-600 dark:text-green-400">
										Low
									</span>
								</Label>
							</div>
						</RadioGroup>
						<p className="text-muted-foreground text-xs">
							Indicate the importance of this event. High priority events are
							generally urgent or very important.
						</p>
					</div>
				</div>

				<TagInput
					id="categories"
					label="Categories"
					value={formData.categories}
					onChange={(value) => onChange({ categories: value })}
					disabled={isSubmitting}
					placeholder="Ex: Work, Personal, Sports..."
					helpText="Organize your events by categories to facilitate search and filtering"
					maxTagLength={FIELD_LIMITS.CATEGORY}
					maxTotalLength={500}
				/>

				<div className="space-y-2">
					<Label htmlFor="color">Display color</Label>
					<div className="flex flex-wrap gap-2">
						<ColorPickerPopover
							value={formData.color}
							onChange={(color) => onChange({ color })}
							disabled={isSubmitting}
						/>
						<Input
							id="color"
							type="color"
							value={formData.color || "#000000"}
							onChange={(e) =>
								onChange({ color: e.target.value.toUpperCase() })
							}
							disabled={isSubmitting}
							className="h-10 w-16 cursor-pointer"
							aria-label="Custom color picker"
						/>
						<Input
							value={formData.color || ""}
							onChange={(e) =>
								onChange({ color: e.target.value.toUpperCase() })
							}
							disabled={isSubmitting}
							placeholder="#FF0000"
							pattern="^#[0-9A-Fa-f]{6}$"
							className="min-w-[120px] flex-1"
							aria-label="Hexadecimal color code"
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						Choose a color to easily identify this event in your calendar.
						<span className="mt-1 block">
							Use predefined colors, the visual picker, or enter a hexadecimal
							code.
						</span>
					</p>
				</div>
			</div>

			{/* Privacy metadata */}
			<div className="space-y-4">
				<h4 className="mb-2 font-medium text-sm">Privacy and availability</h4>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="class">Visibility</Label>
						<Select
							value={formData.class || "none"}
							onValueChange={(value) =>
								onChange({ class: value === "none" ? undefined : value })
							}
							disabled={isSubmitting}
						>
							<SelectTrigger id="class">
								<SelectValue placeholder="Not defined" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Not defined</SelectItem>
								<SelectItem value="PUBLIC">
									Public (visible to everyone)
								</SelectItem>
								<SelectItem value="PRIVATE">
									Private (visible only to you)
								</SelectItem>
								<SelectItem value="CONFIDENTIAL">
									Confidential (sensitive information)
								</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Controls who can see the details of this event in your calendar.
						</p>
					</div>
					<div className="space-y-2">
						<Label htmlFor="transp">Availability</Label>
						<Select
							value={formData.transp || "none"}
							onValueChange={(value) =>
								onChange({ transp: value === "none" ? undefined : value })
							}
							disabled={isSubmitting}
						>
							<SelectTrigger>
								<SelectValue placeholder="Not defined" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">Not defined</SelectItem>
								<SelectItem value="OPAQUE">Busy (blocks time)</SelectItem>
								<SelectItem value="TRANSPARENT">
									Free (does not block time)
								</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-xs">
							Indicates if this event blocks your time or if you remain
							available
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
