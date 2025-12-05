/**
 * Page Transition - Smooth animations between pages
 */

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface PageTransitionProps {
	children: ReactNode;
	className?: string;
}

/**
 * Fade and slide up transition
 */
export function PageTransition({ children, className }: PageTransitionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{
				duration: 0.3,
				ease: [0.25, 0.1, 0.25, 1],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Staggered fade in for lists
 */
export function StaggerContainer({
	children,
	className,
	delay = 0,
}: PageTransitionProps & { delay?: number }) {
	return (
		<motion.div
			initial="hidden"
			animate="visible"
			variants={{
				hidden: {},
				visible: {
					transition: {
						staggerChildren: 0.05,
						delayChildren: delay,
					},
				},
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Individual stagger item
 */
export function StaggerItem({ children, className }: PageTransitionProps) {
	return (
		<motion.div
			variants={{
				hidden: { opacity: 0, y: 20 },
				visible: {
					opacity: 1,
					y: 0,
					transition: {
						duration: 0.3,
						ease: [0.25, 0.1, 0.25, 1],
					},
				},
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Scale fade transition (good for modals/cards)
 */
export function ScaleFade({ children, className }: PageTransitionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			transition={{
				duration: 0.2,
				ease: [0.25, 0.1, 0.25, 1],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Slide from right (good for detail pages)
 */
export function SlideFromRight({ children, className }: PageTransitionProps) {
	return (
		<motion.div
			initial={{ opacity: 0, x: 40 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -40 }}
			transition={{
				duration: 0.3,
				ease: [0.25, 0.1, 0.25, 1],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Animated list item with exit animation
 */
export function AnimatedListItem({
	children,
	className,
	layoutId,
}: PageTransitionProps & { layoutId?: string }) {
	return (
		<motion.div
			layout
			layoutId={layoutId}
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
			transition={{
				duration: 0.2,
				ease: [0.25, 0.1, 0.25, 1],
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}

/**
 * Presence wrapper for conditional rendering with animation
 */
export function Presence({
	children,
	show,
	mode = "sync",
}: {
	children: ReactNode;
	show: boolean;
	mode?: "sync" | "wait" | "popLayout";
}) {
	return <AnimatePresence mode={mode}>{show && children}</AnimatePresence>;
}
