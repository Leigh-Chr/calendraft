/**
 * Hook to check server availability
 * Separates server status checking logic from components
 */

import { useCallback, useEffect, useState } from "react";

type ServerStatus = "checking" | "online" | "offline";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
const CHECK_INTERVAL = 30000; // Check every 30 seconds

/**
 * Hook to monitor server status
 */
export function useServerStatus() {
	const [status, setStatus] = useState<ServerStatus>("checking");
	const [lastChecked, setLastChecked] = useState<Date | null>(null);

	const checkServer = useCallback(async () => {
		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

			const response = await fetch(`${SERVER_URL}/`, {
				signal: controller.signal,
				method: "GET",
			});

			clearTimeout(timeoutId);

			if (response.ok) {
				setStatus("online");
				setLastChecked(new Date());
			} else {
				setStatus("offline");
				setLastChecked(new Date());
			}
		} catch (_error) {
			setStatus("offline");
			setLastChecked(new Date());
		}
	}, []);

	useEffect(() => {
		// Initial check
		checkServer();

		// Periodic checks
		const interval = setInterval(checkServer, CHECK_INTERVAL);

		return () => {
			clearInterval(interval);
		};
	}, [checkServer]);

	return {
		status,
		lastChecked,
		isOnline: status === "online",
		isOffline: status === "offline",
		isChecking: status === "checking",
		refetch: checkServer,
	};
}
