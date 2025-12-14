import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTag, getLastTag, parseTags, removeTag } from "@/lib/tag-utils";

interface TagInputProps {
	id?: string;
	label: string;
	value: string | undefined;
	onChange: (value: string | undefined) => void;
	disabled?: boolean;
	placeholder?: string;
	helpText?: string;
	maxTagLength?: number;
	maxTotalLength?: number;
}

/**
 * Reusable component for managing comma-separated tags (categories, resources, etc.)
 * Supports adding tags via Enter key or comma, and removing tags via X button
 */
export function TagInput({
	id,
	label,
	value,
	onChange,
	disabled = false,
	placeholder = "Add a tag (Enter or comma)",
	helpText = "Press Enter or type a comma to add a tag",
	maxTagLength,
	maxTotalLength,
}: TagInputProps) {
	const [inputValue, setInputValue] = useState(() => getLastTag(value));
	const tags = parseTags(value);

	// Sync input value when external value changes
	useEffect(() => {
		const lastTag = getLastTag(value);
		setInputValue(lastTag);
	}, [value]);

	const checkLengthLimit = (updatedValue: string | undefined): boolean => {
		if (!maxTotalLength || !updatedValue) return true;
		return updatedValue.length <= maxTotalLength;
	};

	const handleCommaInput = (newValue: string) => {
		const parts = newValue.split(",");
		const tagToAdd = parts[0]?.trim();
		if (!tagToAdd) return;

		const updated = addTag(value, tagToAdd);
		if (!checkLengthLimit(updated)) return;

		onChange(updated);
		setInputValue("");
	};

	const handleRegularInput = (newValue: string) => {
		const existingTags = tags.slice(0, -1);
		const updated =
			existingTags.length > 0
				? `${existingTags.join(", ")}, ${newValue}`
				: newValue || undefined;
		if (!checkLengthLimit(updated)) return;
		onChange(updated || undefined);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;

		if (maxTagLength && newValue.length > maxTagLength) {
			return;
		}

		setInputValue(newValue);

		if (newValue.includes(",")) {
			handleCommaInput(newValue);
		} else {
			handleRegularInput(newValue);
		}
	};

	const handleAddTag = (tagValue: string) => {
		const trimmedValue = tagValue.trim();
		if (!trimmedValue) return;

		const updated = addTag(value, trimmedValue);
		if (!checkLengthLimit(updated)) return;

		onChange(updated);
		setInputValue("");
	};

	const handleRemoveLastTag = () => {
		const lastTag = tags[tags.length - 1];
		if (!lastTag) return;

		const updated = removeTag(value, lastTag);
		onChange(updated);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === ",") {
			e.preventDefault();
			handleAddTag(inputValue);
		} else if (e.key === "Backspace" && inputValue === "") {
			handleRemoveLastTag();
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		const updated = removeTag(value, tagToRemove);
		onChange(updated);
	};

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<div className="space-y-2">
				<div className="flex min-h-[2.5rem] flex-wrap gap-2 rounded-md border p-2">
					{tags.map((tag) => (
						<Badge
							key={tag}
							variant="secondary"
							className="flex items-center gap-1"
						>
							{tag}
							<button
								type="button"
								onClick={() => handleRemoveTag(tag)}
								disabled={disabled}
								className="ml-1 min-h-[44px] rounded-full p-1.5 transition-colors hover:bg-destructive/20 sm:min-h-0 sm:p-0.5"
								aria-label={`Remove ${tag}`}
							>
								<X className="h-4 w-4 sm:h-3 sm:w-3" />
							</button>
						</Badge>
					))}
					<Input
						id={id}
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						disabled={disabled}
						placeholder={placeholder}
						className="min-w-[120px] flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 sm:min-w-[200px]"
					/>
				</div>
				{helpText && (
					<p className="text-muted-foreground text-xs">{helpText}</p>
				)}
			</div>
		</div>
	);
}
