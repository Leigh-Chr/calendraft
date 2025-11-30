import { Calendar, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TourStep {
	content: React.ReactNode;
	selectorId: string;
	width?: number;
	height?: number;
	onClickWithinArea?: () => void;
	position?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
	currentStep: number;
	totalSteps: number;
	nextStep: () => void;
	previousStep: () => void;
	endTour: () => void;
	isActive: boolean;
	startTour: () => void;
	setSteps: (steps: TourStep[]) => void;
	steps: TourStep[];
	isTourCompleted: boolean;
	setIsTourCompleted: (completed: boolean) => void;
}

interface TourProviderProps {
	children: React.ReactNode;
	onComplete?: () => void;
	onSkip?: () => void;
	className?: string;
	isTourCompleted?: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

const PADDING = 16;
const CONTENT_WIDTH = 320;
const CONTENT_HEIGHT = 200;

function getElementPosition(id: string) {
	const element = document.getElementById(id);
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return {
		top: rect.top + window.scrollY,
		left: rect.left + window.scrollX,
		width: rect.width,
		height: rect.height,
	};
}

function calculateContentPosition(
	elementPos: { top: number; left: number; width: number; height: number },
	position: "top" | "bottom" | "left" | "right" = "bottom",
) {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	let left = elementPos.left;
	let top = elementPos.top;

	switch (position) {
		case "top":
			top = elementPos.top - CONTENT_HEIGHT - PADDING;
			left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2;
			break;
		case "bottom":
			top = elementPos.top + elementPos.height + PADDING;
			left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2;
			break;
		case "left":
			left = elementPos.left - CONTENT_WIDTH - PADDING;
			top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
			break;
		case "right":
			left = elementPos.left + elementPos.width + PADDING;
			top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
			break;
	}

	return {
		top: Math.max(
			PADDING,
			Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING),
		),
		left: Math.max(
			PADDING,
			Math.min(left, viewportWidth - CONTENT_WIDTH - PADDING),
		),
		width: CONTENT_WIDTH,
		height: CONTENT_HEIGHT,
	};
}

export function TourProvider({
	children,
	onComplete,
	onSkip,
	className,
	isTourCompleted = false,
}: TourProviderProps) {
	const [steps, setSteps] = useState<TourStep[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [elementPosition, setElementPosition] = useState<{
		top: number;
		left: number;
		width: number;
		height: number;
	} | null>(null);
	const [isCompleted, setIsCompleted] = useState(isTourCompleted);

	const updateElementPosition = useCallback(() => {
		if (currentStep >= 0 && currentStep < steps.length) {
			const position = getElementPosition(steps[currentStep]?.selectorId ?? "");
			if (position) {
				setElementPosition(position);
			}
		}
	}, [currentStep, steps]);

	useEffect(() => {
		updateElementPosition();
		window.addEventListener("resize", updateElementPosition);
		window.addEventListener("scroll", updateElementPosition);

		return () => {
			window.removeEventListener("resize", updateElementPosition);
			window.removeEventListener("scroll", updateElementPosition);
		};
	}, [updateElementPosition]);

	const nextStep = useCallback(() => {
		setCurrentStep((prev) => {
			if (prev >= steps.length - 1) {
				return -1;
			}
			return prev + 1;
		});

		if (currentStep === steps.length - 1) {
			setIsCompleted(true);
			onComplete?.();
		}
	}, [steps.length, onComplete, currentStep]);

	const previousStep = useCallback(() => {
		setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
	}, []);

	const endTour = useCallback(() => {
		setCurrentStep(-1);
		setIsCompleted(true);
		onSkip?.();
	}, [onSkip]);

	const startTour = useCallback(() => {
		if (isCompleted) {
			setIsCompleted(false);
		}
		setCurrentStep(0);
	}, [isCompleted]);

	const handleClick = useCallback(
		(e: MouseEvent) => {
			if (
				currentStep >= 0 &&
				elementPosition &&
				steps[currentStep]?.onClickWithinArea
			) {
				const clickX = e.clientX + window.scrollX;
				const clickY = e.clientY + window.scrollY;

				const isWithinBounds =
					clickX >= elementPosition.left &&
					clickX <=
						elementPosition.left +
							(steps[currentStep]?.width || elementPosition.width) &&
					clickY >= elementPosition.top &&
					clickY <=
						elementPosition.top +
							(steps[currentStep]?.height || elementPosition.height);

				if (isWithinBounds) {
					steps[currentStep].onClickWithinArea?.();
				}
			}
		},
		[currentStep, elementPosition, steps],
	);

	useEffect(() => {
		window.addEventListener("click", handleClick);
		return () => {
			window.removeEventListener("click", handleClick);
		};
	}, [handleClick]);

	const setIsTourCompleted = useCallback((completed: boolean) => {
		setIsCompleted(completed);
	}, []);

	return (
		<TourContext.Provider
			value={{
				currentStep,
				totalSteps: steps.length,
				nextStep,
				previousStep,
				endTour,
				isActive: currentStep >= 0,
				startTour,
				setSteps,
				steps,
				isTourCompleted: isCompleted,
				setIsTourCompleted,
			}}
		>
			{children}
			<AnimatePresence>
				{currentStep >= 0 && elementPosition && (
					<>
						{/* Overlay with cutout */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="fixed inset-0 z-50 overflow-hidden bg-black/60"
							style={{
								clipPath: `polygon(
                  0% 0%,
                  0% 100%,
                  100% 100%,
                  100% 0%,
                  ${elementPosition.left}px 0%,
                  ${elementPosition.left}px ${elementPosition.top}px,
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top}px,
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,
                  ${elementPosition.left}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,
                  ${elementPosition.left}px 0%
                )`,
							}}
							onClick={endTour}
							aria-hidden="true"
						/>

						{/* Highlighted element border */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							style={{
								position: "fixed",
								top: elementPosition.top - window.scrollY,
								left: elementPosition.left - window.scrollX,
								width: steps[currentStep]?.width || elementPosition.width,
								height: steps[currentStep]?.height || elementPosition.height,
							}}
							className={cn(
								"z-[60] rounded-lg border-2 border-primary shadow-[0_0_0_4px_rgba(var(--primary),0.2)]",
								className,
							)}
						/>

						{/* Content popover */}
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{
								opacity: 1,
								y: 0,
								top:
									calculateContentPosition(
										elementPosition,
										steps[currentStep]?.position,
									).top - window.scrollY,
								left:
									calculateContentPosition(
										elementPosition,
										steps[currentStep]?.position,
									).left - window.scrollX,
							}}
							transition={{
								duration: 0.4,
								ease: [0.16, 1, 0.3, 1],
								opacity: { duration: 0.3 },
							}}
							exit={{ opacity: 0, y: 10 }}
							style={{
								position: "fixed",
								width: calculateContentPosition(
									elementPosition,
									steps[currentStep]?.position,
								).width,
							}}
							className="z-[100] rounded-xl border bg-card p-4 shadow-lg"
							role="dialog"
							aria-modal="true"
							aria-label={`Étape ${currentStep + 1} sur ${steps.length}`}
						>
							{/* Progress indicator */}
							<div className="absolute top-4 right-4 font-mono text-muted-foreground text-xs">
								{currentStep + 1} / {steps.length}
							</div>

							<AnimatePresence mode="wait">
								<motion.div
									key={`tour-content-${currentStep}`}
									initial={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
									animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
									exit={{ opacity: 0, scale: 0.98, filter: "blur(2px)" }}
									transition={{ duration: 0.2 }}
									className="overflow-hidden pr-8"
								>
									{steps[currentStep]?.content}
								</motion.div>
							</AnimatePresence>

							{/* Navigation buttons */}
							<div className="mt-4 flex items-center justify-between border-t pt-4">
								<div>
									{currentStep > 0 && (
										<button
											type="button"
											onClick={previousStep}
											className="text-muted-foreground text-sm transition-colors hover:text-foreground"
										>
											← Précédent
										</button>
									)}
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={endTour}
										className="text-muted-foreground text-sm transition-colors hover:text-foreground"
									>
										Passer
									</button>
									<Button onClick={nextStep} size="sm">
										{currentStep === steps.length - 1
											? "Terminer"
											: "Suivant →"}
									</Button>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</TourContext.Provider>
	);
}

export function useTour() {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
}

interface TourAlertDialogProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	title?: string;
	description?: string;
}

export function TourAlertDialog({
	isOpen,
	setIsOpen,
	title = "Bienvenue sur Calendraft ! 👋",
	description = "Découvrez les fonctionnalités principales de l'application avec un tour guidé rapide (~30 secondes).",
}: TourAlertDialogProps) {
	const { startTour, steps, isTourCompleted, currentStep, setIsTourCompleted } =
		useTour();

	if (isTourCompleted || steps.length === 0 || currentStep > -1) {
		return null;
	}

	const handleStart = () => {
		setIsOpen(false);
		startTour();
	};

	const handleSkip = () => {
		setIsOpen(false);
		setIsTourCompleted(true);
	};

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogContent className="max-w-md p-6">
				<AlertDialogHeader className="flex flex-col items-center justify-center">
					{/* Animated icon */}
					<div className="relative mb-4">
						<motion.div
							initial={{ scale: 0.8, opacity: 0 }}
							animate={{
								scale: 1,
								opacity: 1,
								y: [0, -6, 0],
							}}
							transition={{
								duration: 0.4,
								ease: "easeOut",
								y: {
									duration: 2,
									repeat: Number.POSITIVE_INFINITY,
									ease: "easeInOut",
								},
							}}
							className="relative"
						>
							<div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10">
								<Calendar className="size-10 text-primary" />
							</div>
							<motion.div
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ delay: 0.3, duration: 0.3 }}
								className="-top-1 -right-1 absolute"
							>
								<div className="flex size-7 items-center justify-center rounded-full bg-primary">
									<Sparkles className="size-4 text-primary-foreground" />
								</div>
							</motion.div>
						</motion.div>
					</div>

					<AlertDialogTitle className="text-center font-semibold text-xl">
						{title}
					</AlertDialogTitle>
					<AlertDialogDescription className="mt-2 text-center text-muted-foreground text-sm leading-relaxed">
						{description}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="mt-6 space-y-3">
					<Button onClick={handleStart} className="w-full">
						Commencer le tour
					</Button>
					<Button onClick={handleSkip} variant="ghost" className="w-full">
						Passer pour l'instant
					</Button>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
