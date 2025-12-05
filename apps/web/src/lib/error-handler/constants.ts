/**
 * Error message constants
 */

import type { ErrorInfo } from "./types";

export const ERROR_MESSAGES: Record<string, ErrorInfo> = {
	UNAUTHORIZED: {
		title: "Authentication Required",
		description: "You must be logged in to perform this action.",
	},
	FORBIDDEN: {
		title: "Access Denied",
		description: "You do not have the necessary permissions.",
	},
	NOT_FOUND: {
		title: "Resource Not Found",
		description: "The requested resource does not exist or has been deleted.",
	},
	BAD_REQUEST: {
		title: "Invalid Request",
		description: "The provided data is incorrect.",
	},
	INTERNAL_SERVER_ERROR: {
		title: "Server Error",
		description: "An error occurred on the server. Please try again later.",
	},
	TIMEOUT: {
		title: "Timeout",
		description: "The request took too long. Check your connection.",
	},
	NETWORK_ERROR: {
		title: "Network Error",
		description:
			"Unable to contact the server. Check your connection and that the server is running.",
	},
};

export const NETWORK_ERROR_PATTERNS = ["fetch", "network", "failed to fetch"];
