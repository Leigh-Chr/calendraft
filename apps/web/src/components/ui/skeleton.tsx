import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn("shimmer rounded-[var(--radius-md)] bg-accent", className)}
			{...props}
		/>
	);
}

export { Skeleton };
