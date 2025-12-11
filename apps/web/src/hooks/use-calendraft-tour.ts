/**
 * Tour hook - Feature in development
 * Placeholder for guided tour functionality
 */

import { useState } from "react";

export function useCalendraftTour() {
	const [openDialog, setOpenDialog] = useState(false);

	// Placeholder implementation
	// TODO: Implement tour functionality
	return {
		openDialog,
		setOpenDialog,
		startTour: () => {
			// No-op for now
		},
		stopTour: () => {
			// No-op for now
		},
		isTourActive: false,
	};
}
