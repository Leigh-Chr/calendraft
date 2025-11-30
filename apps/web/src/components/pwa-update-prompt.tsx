import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
						toast.info("Nouvelle version disponible", {
							description:
								"Une mise à jour est disponible. Cliquez pour actualiser.",
							duration: Number.POSITIVE_INFINITY,
							action: {
								label: "Actualiser",
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
						toast.success("Application prête", {
							description: "L'application est prête à fonctionner hors ligne.",
							duration: 4000,
						});
					},
					onRegisterError(error) {
						console.error("SW registration error:", error);
					},
				});
			} catch (error) {
				console.error("Failed to register service worker:", error);
			}
		};

		registerSW();

		// Listen for controllerchange to reload when new SW takes over
		const handleControllerChange = () => {
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
			const handleStateChange = () => {
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
