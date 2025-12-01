/**
 * Empty State - États vides engageants avec illustrations
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonVariant =
	| "default"
	| "destructive"
	| "outline"
	| "secondary"
	| "ghost"
	| "link";

interface EmptyStateProps {
	icon?: ReactNode;
	title: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
		variant?: ButtonVariant;
		icon?: ReactNode;
	};
	secondaryAction?: {
		label: string;
		onClick: () => void;
		icon?: ReactNode;
	};
	className?: string;
	children?: ReactNode;
}

export function EmptyState({
	icon,
	title,
	description,
	action,
	secondaryAction,
	className,
	children,
}: EmptyStateProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className={cn(
				"flex flex-col items-center justify-center py-16 text-center",
				className,
			)}
		>
			{icon && (
				<motion.div
					initial={{ scale: 0.8 }}
					animate={{ scale: 1 }}
					transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
					className="mb-6"
				>
					{icon}
				</motion.div>
			)}

			<motion.h3
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2 }}
				className="mb-2 font-semibold text-lg"
			>
				{title}
			</motion.h3>

			{description && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="mb-6 max-w-md text-muted-foreground"
				>
					{description}
				</motion.p>
			)}

			{(action || secondaryAction) && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="flex flex-wrap justify-center gap-3"
				>
					{action && (
						<Button
							onClick={action.onClick}
							variant={action.variant || "default"}
						>
							{action.icon}
							{action.label}
						</Button>
					)}
					{secondaryAction && (
						<Button onClick={secondaryAction.onClick} variant="outline">
							{secondaryAction.icon}
							{secondaryAction.label}
						</Button>
					)}
				</motion.div>
			)}

			{children}
		</motion.div>
	);
}

/**
 * Illustration: Empty Calendar
 */
export function EmptyCalendarIllustration({
	className,
}: {
	className?: string;
}) {
	return (
		<svg
			className={cn("h-32 w-32 text-muted-foreground/30", className)}
			viewBox="0 0 128 128"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Calendrier vide"
		>
			<rect
				x="16"
				y="24"
				width="96"
				height="88"
				rx="8"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path d="M16 48H112" stroke="currentColor" strokeWidth="4" />
			<rect x="32" y="16" width="8" height="16" rx="2" fill="currentColor" />
			<rect x="88" y="16" width="8" height="16" rx="2" fill="currentColor" />
			{/* Calendar grid */}
			<rect
				x="28"
				y="60"
				width="16"
				height="16"
				rx="2"
				fill="currentColor"
				opacity="0.2"
			/>
			<rect
				x="56"
				y="60"
				width="16"
				height="16"
				rx="2"
				fill="currentColor"
				opacity="0.2"
			/>
			<rect
				x="84"
				y="60"
				width="16"
				height="16"
				rx="2"
				fill="currentColor"
				opacity="0.2"
			/>
			<rect
				x="28"
				y="84"
				width="16"
				height="16"
				rx="2"
				fill="currentColor"
				opacity="0.2"
			/>
			<rect
				x="56"
				y="84"
				width="16"
				height="16"
				rx="2"
				fill="currentColor"
				opacity="0.2"
			/>
		</svg>
	);
}

/**
 * Illustration: Empty Events
 */
export function EmptyEventsIllustration({ className }: { className?: string }) {
	return (
		<svg
			className={cn("h-32 w-32 text-muted-foreground/30", className)}
			viewBox="0 0 128 128"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Aucun événement"
		>
			<circle cx="64" cy="64" r="48" stroke="currentColor" strokeWidth="4" />
			<path
				d="M64 32V64L80 80"
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle cx="64" cy="64" r="4" fill="currentColor" />
			{/* Decorative dots */}
			<circle cx="64" cy="24" r="3" fill="currentColor" />
			<circle cx="64" cy="104" r="3" fill="currentColor" />
			<circle cx="24" cy="64" r="3" fill="currentColor" />
			<circle cx="104" cy="64" r="3" fill="currentColor" />
		</svg>
	);
}

/**
 * Illustration: Search Empty
 */
export function EmptySearchIllustration({ className }: { className?: string }) {
	return (
		<svg
			className={cn("h-32 w-32 text-muted-foreground/30", className)}
			viewBox="0 0 128 128"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Aucun résultat"
		>
			<circle cx="52" cy="52" r="32" stroke="currentColor" strokeWidth="4" />
			<path
				d="M76 76L104 104"
				stroke="currentColor"
				strokeWidth="6"
				strokeLinecap="round"
			/>
			{/* Question mark */}
			<path
				d="M44 44C44 40 48 36 52 36C56 36 60 40 60 44C60 48 56 50 52 52V58"
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
			/>
			<circle cx="52" cy="66" r="3" fill="currentColor" />
		</svg>
	);
}

/**
 * Illustration: Import File
 */
export function ImportFileIllustration({ className }: { className?: string }) {
	return (
		<svg
			className={cn("h-32 w-32 text-muted-foreground/30", className)}
			viewBox="0 0 128 128"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Importer un fichier"
		>
			{/* File shape */}
			<path
				d="M32 16H80L96 32V112H32V16Z"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path d="M80 16V32H96" stroke="currentColor" strokeWidth="4" />
			{/* Arrow */}
			<path
				d="M64 56V88"
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
			/>
			<path
				d="M52 76L64 88L76 76"
				stroke="currentColor"
				strokeWidth="4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			{/* Lines on document */}
			<path d="M44 48H72" stroke="currentColor" strokeWidth="2" opacity="0.5" />
		</svg>
	);
}

/**
 * Illustration: Success/Checkmark
 */
export function SuccessIllustration({ className }: { className?: string }) {
	return (
		<svg
			className={cn("h-32 w-32 text-green-500", className)}
			viewBox="0 0 128 128"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Succès"
		>
			<circle cx="64" cy="64" r="48" stroke="currentColor" strokeWidth="4" />
			<motion.path
				initial={{ pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={{ duration: 0.5, delay: 0.2 }}
				d="M40 64L56 80L88 48"
				stroke="currentColor"
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
