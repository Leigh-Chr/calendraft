/**
 * URL Validator - Protection against SSRF (Server-Side Request Forgery)
 * Validates URLs before making server-side HTTP requests
 */

/**
 * List of blocked hostnames for cloud metadata services
 */
const BLOCKED_HOSTNAMES = [
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"[::1]",
	"[::]",
	"metadata.google.internal",
	"metadata.google",
	"169.254.169.254", // AWS/GCP/Azure metadata
	"169.254.170.2", // AWS ECS metadata
	"fd00:ec2::254", // AWS IPv6 metadata
];

/**
 * Check if an IP address is in a private range
 * Private ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8
 */
function isPrivateIPv4(ip: string): boolean {
	const parts = ip.split(".").map(Number);
	if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
		return false;
	}

	const [a, b] = parts;

	// 10.0.0.0/8
	if (a === 10) return true;

	// 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
	if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;

	// 192.168.0.0/16
	if (a === 192 && b === 168) return true;

	// 127.0.0.0/8 (loopback)
	if (a === 127) return true;

	// 0.0.0.0/8
	if (a === 0) return true;

	// 169.254.0.0/16 (link-local)
	if (a === 169 && b === 254) return true;

	return false;
}

/**
 * Check if an IPv6 address is private/local
 */
function isPrivateIPv6(ip: string): boolean {
	const normalized = ip.toLowerCase();

	// Loopback
	if (normalized === "::1" || normalized === "[::1]") return true;

	// Unspecified
	if (normalized === "::" || normalized === "[::]") return true;

	// Link-local (fe80::/10)
	if (normalized.startsWith("fe80:") || normalized.startsWith("[fe80:"))
		return true;

	// Unique local (fc00::/7)
	if (
		normalized.startsWith("fc") ||
		normalized.startsWith("fd") ||
		normalized.startsWith("[fc") ||
		normalized.startsWith("[fd")
	)
		return true;

	return false;
}

/**
 * Check if a hostname is a blocked cloud metadata service
 */
function isCloudMetadata(hostname: string): boolean {
	const normalizedHostname = hostname.toLowerCase();
	return BLOCKED_HOSTNAMES.some(
		(blocked) =>
			normalizedHostname === blocked ||
			normalizedHostname.endsWith(`.${blocked}`),
	);
}

/**
 * Check if a hostname looks like an IP address
 */
function isIPAddress(hostname: string): boolean {
	// IPv4 pattern
	const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
	if (ipv4Pattern.test(hostname)) return true;

	// IPv6 pattern (simplified - starts with [ or contains ::)
	if (hostname.startsWith("[") || hostname.includes("::")) return true;

	return false;
}

/**
 * Result of URL validation
 */
export interface UrlValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validate that a URL is safe for server-side fetching
 * Blocks:
 * - Private IP addresses (10.x, 172.16-31.x, 192.168.x, 127.x)
 * - Cloud metadata endpoints (169.254.169.254, metadata.google, etc.)
 * - Localhost and local hostnames
 * - Non-HTTP(S) protocols
 */
export function validateExternalUrl(urlString: string): UrlValidationResult {
	let url: URL;

	try {
		url = new URL(urlString);
	} catch {
		return { valid: false, error: "URL invalide" };
	}

	// Only allow HTTP and HTTPS
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return {
			valid: false,
			error: "Seuls les protocoles HTTP et HTTPS sont autorisés",
		};
	}

	const hostname = url.hostname.toLowerCase();

	// Check blocked hostnames
	if (isCloudMetadata(hostname)) {
		return {
			valid: false,
			error: "Accès aux services de métadonnées cloud non autorisé",
		};
	}

	// Check if hostname is an IP address
	if (isIPAddress(hostname)) {
		// Remove brackets for IPv6
		const cleanedIP = hostname.replace(/^\[|\]$/g, "");

		if (isPrivateIPv4(cleanedIP)) {
			return {
				valid: false,
				error: "Accès aux adresses IP privées non autorisé",
			};
		}

		if (isPrivateIPv6(cleanedIP)) {
			return {
				valid: false,
				error: "Accès aux adresses IPv6 privées non autorisé",
			};
		}
	}

	// Check for localhost variations
	if (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local")
	) {
		return {
			valid: false,
			error: "Accès à localhost non autorisé",
		};
	}

	return { valid: true };
}

/**
 * Check if URL validation passes, throws TRPCError if not
 */
export function assertValidExternalUrl(urlString: string): void {
	const result = validateExternalUrl(urlString);
	if (!result.valid) {
		// Import TRPCError dynamically to avoid circular dependencies
		const { TRPCError } = require("@trpc/server");
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: result.error || "URL non autorisée",
		});
	}
}
