/**
 * Tour component - Feature in development
 * Placeholder for guided tour functionality
 */

interface TourAlertDialogProps {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
}

export function TourAlertDialog({ isOpen, setIsOpen }: TourAlertDialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="max-w-md rounded-lg bg-background p-6">
				<h2 className="mb-4 font-semibold text-lg">Tour Feature</h2>
				<p className="mb-4 text-muted-foreground">
					This feature is coming soon!
				</p>
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
				>
					Close
				</button>
			</div>
		</div>
	);
}
