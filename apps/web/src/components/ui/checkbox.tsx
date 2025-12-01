import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion } from "motion/react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Animated checkmark SVG with draw effect
function AnimatedCheckIcon({ className }: { className?: string }) {
	return (
		<motion.svg
			className={className}
			viewBox="0 0 14 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			initial={{ scale: 0.5, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 20,
			}}
		>
			<title>Checked</title>
			<motion.path
				d="M2.5 7.5L5.5 10.5L11.5 4.5"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={{ pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={{
					duration: 0.2,
					delay: 0.05,
					ease: "easeOut",
				}}
			/>
		</motion.svg>
	);
}

function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs outline-none transition-all duration-150 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:scale-[1.05] data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary dark:aria-invalid:ring-destructive/40",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className="grid place-content-center text-current"
			>
				<AnimatedCheckIcon className="size-3.5" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
