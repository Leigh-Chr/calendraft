/**
 * Template Selector - Quick selection of event templates
 */

import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	EVENT_TEMPLATES,
	type EventTemplate,
	templateToFormData,
} from "./event-templates";

interface TemplateSelectorProps {
	onSelect: (data: ReturnType<typeof templateToFormData>) => void;
	baseDate?: Date;
	className?: string;
}

export function TemplateSelector({
	onSelect,
	baseDate,
	className,
}: TemplateSelectorProps) {
	const handleSelect = (template: EventTemplate) => {
		const formData = templateToFormData(template, baseDate);
		onSelect(formData);
	};

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-center gap-2 text-muted-foreground text-sm">
				<Sparkles className="h-4 w-4" />
				<span>Create from a template</span>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
				{EVENT_TEMPLATES.map((template, index) => (
					<motion.div
						key={template.id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.03 }}
					>
						<Button
							type="button"
							variant="outline"
							className="flex h-auto w-full flex-col gap-1.5 p-3 hover:border-primary/50"
							onClick={() => handleSelect(template)}
						>
							<div
								className="flex h-8 w-8 items-center justify-center rounded-full text-white"
								style={{ backgroundColor: template.color }}
							>
								{template.icon}
							</div>
							<span className="font-medium text-xs">{template.name}</span>
						</Button>
					</motion.div>
				))}
			</div>
		</div>
	);
}

/**
 * Compact template selector for inline use
 */
export function TemplateChips({
	onSelect,
	baseDate,
	className,
	limit = 6,
}: TemplateSelectorProps & { limit?: number }) {
	const handleSelect = (template: EventTemplate) => {
		const formData = templateToFormData(template, baseDate);
		onSelect(formData);
	};

	const displayedTemplates = EVENT_TEMPLATES.slice(0, limit);

	return (
		<div className={cn("flex flex-wrap gap-2", className)}>
			{displayedTemplates.map((template) => (
				<Button
					key={template.id}
					type="button"
					variant="outline"
					size="sm"
					className="h-8 gap-1.5 text-xs"
					onClick={() => handleSelect(template)}
				>
					<div
						className="flex h-4 w-4 items-center justify-center rounded-full text-white"
						style={{ backgroundColor: template.color }}
					>
						{template.icon}
					</div>
					{template.name}
				</Button>
			))}
		</div>
	);
}
