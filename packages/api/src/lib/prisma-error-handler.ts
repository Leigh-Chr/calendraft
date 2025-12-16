/**
 * Prisma error handling utilities
 * Maps Prisma-specific errors to tRPC errors with user-friendly messages
 */

import { TRPCError } from "@trpc/server";

// Prisma errors have a code property that starts with "P"
// We check for this pattern instead of using instanceof
// because the error class may not be available in all environments
type PrismaError = {
	code: string;
	meta?: { target?: string | string[] };
};

/**
 * Handle Prisma-specific errors and convert them to tRPC errors
 * @param error - Error to handle (can be any error type)
 * @throws TRPCError with appropriate code and message
 */
export function handlePrismaError(error: unknown): never {
	// Check if error is a Prisma error by checking for the code property
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		typeof error.code === "string" &&
		error.code.startsWith("P")
	) {
		const prismaError = error as PrismaError;
		switch (prismaError.code) {
			case "P2002": {
				// Unique constraint violation
				// Extract field name from meta if available
				const field = prismaError.meta?.target
					? Array.isArray(prismaError.meta.target)
						? prismaError.meta.target.join(", ")
						: String(prismaError.meta.target)
					: "field";

				throw new TRPCError({
					code: "CONFLICT",
					message: `A resource with this ${field} already exists`,
					cause: prismaError,
				});
			}

			case "P2003": {
				// Foreign key constraint violation
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Referenced resource does not exist",
					cause: prismaError,
				});
			}

			case "P2025": {
				// Record not found (for update/delete operations)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Resource not found",
					cause: prismaError,
				});
			}

			case "P2014": {
				// Required relation violation
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Required relation is missing",
					cause: prismaError,
				});
			}

			case "P2015": {
				// Record not found for update
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Resource not found for update",
					cause: prismaError,
				});
			}

			case "P2034": {
				// Transaction failed
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Transaction failed. Please try again.",
					cause: prismaError,
				});
			}

			default: {
				// Unknown Prisma error - log and return generic error
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Database error occurred",
					cause: prismaError,
				});
			}
		}
	}

	// Not a Prisma error, re-throw as-is
	throw error;
}

/**
 * Wrap a Prisma operation with error handling
 * Automatically converts Prisma errors to tRPC errors
 */
export async function withPrismaErrorHandling<T>(
	operation: () => Promise<T>,
): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		handlePrismaError(error);
		// This line is never reached, but TypeScript needs it
		throw error;
	}
}
