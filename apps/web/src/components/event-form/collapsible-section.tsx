import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleSectionProps {
	id: string;
	title: string;
	isExpanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
	badge?: string | number;
	description?: string;
	icon?: LucideIcon;
}

/**
 * Reusable collapsible section component for event form
 */
export function CollapsibleSection({
	id,
	title,
	isExpanded,
	onToggle,
	children,
	badge,
	description,
	icon: Icon,
}: CollapsibleSectionProps) {
	return (
		<div className="space-y-4">
			<button
				type="button"
				onClick={onToggle}
				className="group flex w-full items-center justify-between text-left font-semibold transition-colors hover:text-primary"
				aria-expanded={isExpanded}
				aria-controls={`section-${id}`}
			>
				<div className="flex flex-col items-start gap-1">
					<span className="flex items-center gap-2">
						{Icon && (
							<Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
						)}
						{title}
						{badge !== undefined && (
							<span className="font-normal text-muted-foreground text-xs">
								({badge})
							</span>
						)}
					</span>
					{description && !isExpanded && (
						<span className="font-normal text-muted-foreground text-xs">
							{description}
						</span>
					)}
				</div>
				{isExpanded ? (
					<ChevronUp
						className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
						aria-hidden="true"
					/>
				) : (
					<ChevronDown
						className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
						aria-hidden="true"
					/>
				)}
			</button>
			{isExpanded && (
				<section
					id={`section-${id}`}
					className="space-y-4 border-muted/50 border-l-2 pl-4"
					aria-label={title}
				>
					{children}
				</section>
			)}
		</div>
	);
}
