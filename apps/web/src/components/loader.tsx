import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoaderProps {
	className?: string;
	size?: "sm" | "md" | "lg";
}

export default function Loader({ className, size = "md" }: LoaderProps) {
	const sizeClasses = {
		sm: "h-4 w-4",
		md: "h-6 w-6",
		lg: "h-8 w-8",
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: role="status" is the correct ARIA pattern for loading indicators
		<div
			className={cn("flex h-full items-center justify-center pt-8", className)}
			role="status"
			aria-live="polite"
		>
			<Loader2
				className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
				aria-hidden="true"
			/>
			<span className="sr-only">Loading...</span>
		</div>
	);
}
