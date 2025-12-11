import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export function PWAUpdatePrompt() {
	const [registration, setRegistration] =
		useState<ServiceWorkerRegistration | null>(null);
	const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
		null,
	);
	const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		// Register service worker and listen for updates
		const registerSW = async () => {
			try {
				const { registerSW } = await import("virtual:pwa-register");

				registerSW({
					immediate: true,
					onRegisteredSW(_swUrl, r) {
						if (r) {
							setRegistration(r);
							// Check for updates every hour
							updateIntervalRef.current = setInterval(
								() => {
									r.update();
								},
								60 * 60 * 1000,
							);
						}
					},
					onNeedRefresh() {
						toast.info("New version available", {
							description: "An update is available. Click to refresh.",
							duration: Number.POSITIVE_INFINITY,
							action: {
								label: "Refresh",
								onClick: () => {
									if (waitingWorker) {
										waitingWorker.postMessage({ type: "SKIP_WAITING" });
									}
									window.location.reload();
								},
							},
						});
					},
					onOfflineReady() {
						toast.success("Application ready", {
							description: "The application is ready to work offline.",
							duration: 4000,
						});
					},
					onRegisterError(error) {
						logger.error("SW registration error", error);
					},
				});
			} catch (error) {
				logger.error("Failed to register service worker", error);
			}
		};

		registerSW();

		// Listen for controllerchange to reload when new SW takes over
		const handleControllerChange = (): void => {
			window.location.reload();
		};

		navigator.serviceWorker?.addEventListener(
			"controllerchange",
			handleControllerChange,
		);

		return () => {
			// Clear the update interval to prevent memory leaks
			if (updateIntervalRef.current) {
				clearInterval(updateIntervalRef.current);
				updateIntervalRef.current = null;
			}
			navigator.serviceWorker?.removeEventListener(
				"controllerchange",
				handleControllerChange,
			);
		};
	}, [waitingWorker]);

	// Listen for waiting service worker
	useEffect(() => {
		if (registration) {
			const handleStateChange = (): void => {
				if (registration.waiting) {
					setWaitingWorker(registration.waiting);
				}
			};

			registration.addEventListener("updatefound", () => {
				const newWorker = registration.installing;
				if (newWorker) {
					newWorker.addEventListener("statechange", handleStateChange);
				}
			});

			// Check if there's already a waiting worker
			if (registration.waiting) {
				setWaitingWorker(registration.waiting);
			}
		}
	}, [registration]);

	return null; // This component renders nothing, uses toast for UI
}

// Export a manual update check function for use elsewhere
export async function checkForUpdates() {
	const registrations = await navigator.serviceWorker?.getRegistrations();
	if (registrations) {
		for (const registration of registrations) {
			await registration.update();
		}
	}
}
