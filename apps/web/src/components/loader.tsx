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
		<div
			className={cn("flex h-full items-center justify-center pt-8", className)}
		>
			<Loader2
				className={cn("animate-spin text-muted-foreground", sizeClasses[size])}
			/>
		</div>
	);
}
