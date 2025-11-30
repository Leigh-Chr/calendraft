import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormMessageProps
	extends React.HTMLAttributes<HTMLParagraphElement> {
	message?: string | React.ReactNode;
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
	({ className, message, children, ...props }, ref) => {
		if (!message && !children) {
			return null;
		}

		return (
			<p
				ref={ref}
				className={cn("font-medium text-destructive text-sm", className)}
				{...props}
			>
				{message || children}
			</p>
		);
	},
);
FormMessage.displayName = "FormMessage";

export { FormMessage };
