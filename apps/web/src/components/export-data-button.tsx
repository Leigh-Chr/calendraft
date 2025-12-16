import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";
import { Button } from "./ui/button";

function getErrorMessage(error: unknown): string {
	// Handle tRPC errors specifically
	// tRPC errors have structure: { data: { code: string, ... }, message: string }
	if (
		error &&
		typeof error === "object" &&
		"data" in error &&
		error.data &&
		typeof error.data === "object" &&
		"code" in error.data
	) {
		const errorCode = error.data.code as string;
		if (errorCode === "TOO_MANY_REQUESTS") {
			return "Too many export requests. Please wait before trying again.";
		}
		if (errorCode === "UNAUTHORIZED") {
			return "You must be authenticated to export your data.";
		}
		if ("message" in error && typeof error.message === "string") {
			return error.message;
		}
	}
	if (error instanceof Error) {
		return error.message || "Failed to export your data. Please try again.";
	}
	return "Failed to export your data. Please try again.";
}

export function ExportDataButton() {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const data = await trpcClient.user.exportData.query();
			if (data) {
				// Create a blob with the JSON data
				const jsonString = JSON.stringify(data, null, 2);
				const blob = new Blob([jsonString], { type: "application/json" });
				const url = URL.createObjectURL(blob);

				// Create a temporary link and trigger download
				const link = document.createElement("a");
				link.href = url;
				link.download = `calendraft-export-${new Date().toISOString().split("T")[0]}.json`;
				document.body.appendChild(link);
				link.click();

				// Cleanup
				document.body.removeChild(link);
				URL.revokeObjectURL(url);

				toast.success("Your data has been exported successfully!");
			}
		} catch (error) {
			// Handle tRPC errors specifically
			const errorMessage = getErrorMessage(error);
			toast.error(errorMessage);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<Button
			variant="outline"
			onClick={handleExport}
			disabled={isExporting}
			className="w-full"
		>
			<Download className="mr-2 h-4 w-4" />
			{isExporting ? "Exporting..." : "Export my data"}
		</Button>
	);
}
