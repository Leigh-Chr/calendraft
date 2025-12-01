import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Switch({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer group inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs outline-none transition-colors duration-200 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0",
					// Spring-like transition with overshoot simulation via cubic-bezier
					"transition-[transform,width] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
					// Position based on state
					"data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0",
					// Squish effect during interaction
					"group-active:w-[1.1rem] group-active:data-[state=checked]:translate-x-[calc(100%-6px)]",
					// Dark mode colors
					"dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground",
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
