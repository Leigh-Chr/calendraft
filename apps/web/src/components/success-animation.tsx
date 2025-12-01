/**
 * SuccessAnimation - Feedback visuel animé pour les actions réussies
 * Utilise motion/react pour des animations fluides
 */

import { Calendar, Check, Copy, Download, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AnimationType = "success" | "create" | "delete" | "copy" | "download";

interface SuccessAnimationProps {
	show: boolean;
	type?: AnimationType;
	message?: string;
	onComplete?: () => void;
	duration?: number;
}

const iconMap = {
	success: Check,
	create: Calendar,
	delete: Trash2,
	copy: Copy,
	download: Download,
};

const colorMap = {
	success: "bg-green-500",
	create: "bg-primary",
	delete: "bg-destructive",
	copy: "bg-blue-500",
	download: "bg-emerald-500",
};

export function SuccessAnimation({
	show,
	type = "success",
	message,
	onComplete,
	duration = 1500,
}: SuccessAnimationProps) {
	const Icon = iconMap[type];
	const bgColor = colorMap[type];

	useEffect(() => {
		if (show && onComplete) {
			const timer = setTimeout(onComplete, duration);
			return () => clearTimeout(timer);
		}
	}, [show, onComplete, duration]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
				>
					<motion.div
						initial={{ scale: 0, opacity: 0 }}
						animate={{
							scale: [0, 1.2, 1],
							opacity: 1,
						}}
						exit={{ scale: 1.5, opacity: 0 }}
						transition={{
							duration: 0.4,
							ease: [0.16, 1, 0.3, 1],
						}}
						className="flex flex-col items-center gap-4"
					>
						<motion.div
							className={cn(
								"flex h-20 w-20 items-center justify-center rounded-full text-white shadow-lg",
								bgColor,
							)}
							initial={{ rotate: -180 }}
							animate={{ rotate: 0 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
						>
							<Icon className="h-10 w-10" />
						</motion.div>
						{message && (
							<motion.p
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="font-medium text-lg"
							>
								{message}
							</motion.p>
						)}
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

/**
 * Hook pour gérer l'état de l'animation de succès
 */
export function useSuccessAnimation() {
	const [state, setState] = useState<{
		show: boolean;
		type: AnimationType;
		message?: string;
	}>({
		show: false,
		type: "success",
	});

	const trigger = (type: AnimationType = "success", message?: string) => {
		setState({ show: true, type, message });
	};

	const hide = () => {
		setState((prev) => ({ ...prev, show: false }));
	};

	return {
		...state,
		trigger,
		hide,
	};
}

/**
 * Confetti-like particles animation
 */
export function ConfettiAnimation({ show }: { show: boolean }) {
	const particles = Array.from({ length: 20 }, (_, i) => ({
		id: i,
		x: Math.random() * 100 - 50,
		y: Math.random() * -100 - 50,
		rotation: Math.random() * 360,
		scale: Math.random() * 0.5 + 0.5,
		color: ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"][
			Math.floor(Math.random() * 5)
		],
	}));

	return (
		<AnimatePresence>
			{show && (
				<div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
					{particles.map((particle) => (
						<motion.div
							key={particle.id}
							initial={{
								x: "50vw",
								y: "50vh",
								scale: 0,
								rotate: 0,
							}}
							animate={{
								x: `calc(50vw + ${particle.x}vw)`,
								y: `calc(50vh + ${particle.y}vh)`,
								scale: particle.scale,
								rotate: particle.rotation,
							}}
							exit={{
								y: "100vh",
								opacity: 0,
							}}
							transition={{
								duration: 0.8,
								ease: "easeOut",
							}}
							className="absolute h-3 w-3 rounded-sm"
							style={{ backgroundColor: particle.color }}
						/>
					))}
				</div>
			)}
		</AnimatePresence>
	);
}

/**
 * Ripple effect for buttons
 */
export function RippleButton({
	children,
	className,
	onClick,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const [ripples, setRipples] = useState<
		Array<{ id: number; x: number; y: number }>
	>([]);

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const id = Date.now();

		setRipples((prev) => [...prev, { id, x, y }]);
		setTimeout(() => {
			setRipples((prev) => prev.filter((r) => r.id !== id));
		}, 600);

		onClick?.(e);
	};

	return (
		<button
			className={cn("relative overflow-hidden", className)}
			onClick={handleClick}
			{...props}
		>
			{children}
			<AnimatePresence>
				{ripples.map((ripple) => (
					<motion.span
						key={ripple.id}
						initial={{ scale: 0, opacity: 0.5 }}
						animate={{ scale: 4, opacity: 0 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
						className="pointer-events-none absolute rounded-full bg-white/30"
						style={{
							left: ripple.x - 10,
							top: ripple.y - 10,
							width: 20,
							height: 20,
						}}
					/>
				))}
			</AnimatePresence>
		</button>
	);
}

/**
 * Animated counter for numbers
 */
export function AnimatedCounter({
	value,
	className,
}: {
	value: number;
	className?: string;
}) {
	return (
		<motion.span
			key={value}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 10 }}
			transition={{ duration: 0.2 }}
			className={className}
		>
			{value}
		</motion.span>
	);
}

/**
 * Skeleton pulse animation
 */
export function PulseLoader({ className }: { className?: string }) {
	return (
		<motion.div
			className={cn("rounded-md bg-muted", className)}
			animate={{
				opacity: [0.5, 1, 0.5],
			}}
			transition={{
				duration: 1.5,
				repeat: Number.POSITIVE_INFINITY,
				ease: "easeInOut",
			}}
		/>
	);
}
