import { z } from "zod";
import { FIELD_LIMITS } from "./field-limits";

/**
 * Common reusable Zod schemas for validation
 * These schemas include transformations and can be reused across the codebase
 */

/**
 * Email schema with automatic trimming and validation
 */
export const emailSchema = z
	.string()
	.trim()
	.email("Format d'email invalide")
	.max(
		FIELD_LIMITS.EMAIL,
		`L'email ne peut pas dépasser ${FIELD_LIMITS.EMAIL} caractères`,
	);

/**
 * URL schema with protocol validation and automatic trimming
 * Only allows safe protocols: http, https, mailto, tel
 */
export const urlSchema = z
	.string()
	.trim()
	.max(
		FIELD_LIMITS.URL,
		`L'URL ne peut pas dépasser ${FIELD_LIMITS.URL} caractères`,
	)
	.refine(
		(val) => {
			if (!val || val.trim() === "") return true;
			try {
				const urlObj = new URL(val);
				const safeProtocols = ["http:", "https:", "mailto:", "tel:"];
				return safeProtocols.includes(urlObj.protocol);
			} catch {
				return false;
			}
		},
		{
			message:
				"Format d'URL invalide ou protocole non autorisé. Utilisez http://, https://, mailto: ou tel:",
		},
	)
	.optional()
	.nullable();

/**
 * Trimmed string schema - automatically trims whitespace
 */
export const trimmedStringSchema = <T extends z.ZodString>(schema: T) =>
	schema.trim();

/**
 * String schema with automatic trimming and null conversion
 * Converts empty strings to null
 */
export const nullableTrimmedStringSchema = (maxLength?: number) =>
	z
		.string()
		.trim()
		.max(maxLength || 10000)
		.transform((val) => (val === "" ? null : val))
		.nullable()
		.optional();

/**
 * Date string schema for form inputs (ISO datetime format)
 */
export const dateStringSchema = z
	.string()
	.min(1, "La date est requise")
	.refine(
		(val) => {
			const date = new Date(val);
			return !Number.isNaN(date.getTime());
		},
		{
			message: "Format de date invalide",
		},
	);

/**
 * Schema for validating date range (start < end)
 */
export const dateRangeSchema = z
	.object({
		startDate: dateStringSchema,
		endDate: dateStringSchema,
	})
	.refine(
		(data) => {
			const start = new Date(data.startDate);
			const end = new Date(data.endDate);
			return end > start;
		},
		{
			message: "La date de fin doit être après la date de début",
			path: ["endDate"],
		},
	);
