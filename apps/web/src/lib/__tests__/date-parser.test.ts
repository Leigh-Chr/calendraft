/**
 * Tests for date array parsing functions
 */

import { describe, expect, it, vi } from "vitest";
import { parseDateArray, stringifyDateArray } from "../date-parser";

describe("parseDateArray", () => {
	it("should parse valid date array", () => {
		const jsonString =
			'["2025-01-15T10:00:00.000Z","2025-01-22T10:00:00.000Z"]';
		const result = parseDateArray(jsonString, "RDATE");
		expect(result).toHaveLength(2);
		expect(result[0]).toBeInstanceOf(Date);
		expect(result[1]).toBeInstanceOf(Date);
	});

	it("should return empty array for undefined", () => {
		const result = parseDateArray(undefined, "RDATE");
		expect(result).toEqual([]);
	});

	it("should return empty array for empty string", () => {
		const result = parseDateArray("", "RDATE");
		expect(result).toEqual([]);
	});

	it("should filter out invalid dates", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		const jsonString =
			'["2025-01-15T10:00:00.000Z","invalid-date","2025-01-22T10:00:00.000Z"]';
		const result = parseDateArray(jsonString, "RDATE");
		expect(result).toHaveLength(2);
		expect(consoleSpy).toHaveBeenCalledWith("Some dates in RDATE were invalid");
		consoleSpy.mockRestore();
	});

	it("should handle malformed JSON", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const jsonString = "not-json";
		const result = parseDateArray(jsonString, "RDATE");
		expect(result).toEqual([]);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should reject non-array JSON", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const jsonString = '{"not":"an array"}';
		const result = parseDateArray(jsonString, "RDATE");
		expect(result).toEqual([]);
		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should parse ISO date strings correctly", () => {
		const jsonString = '["2025-01-15T10:00:00.000Z"]';
		const result = parseDateArray(jsonString, "RDATE");
		expect(result[0].toISOString()).toBe("2025-01-15T10:00:00.000Z");
	});

	it("should handle empty array", () => {
		const jsonString = "[]";
		const result = parseDateArray(jsonString, "RDATE");
		expect(result).toEqual([]);
	});
});

describe("stringifyDateArray", () => {
	it("should stringify array of dates", () => {
		const dates = [
			new Date("2025-01-15T10:00:00.000Z"),
			new Date("2025-01-22T10:00:00.000Z"),
		];
		const result = stringifyDateArray(dates);
		expect(result).toBe(
			'["2025-01-15T10:00:00.000Z","2025-01-22T10:00:00.000Z"]',
		);
	});

	it("should return undefined for empty array", () => {
		const result = stringifyDateArray([]);
		expect(result).toBeUndefined();
	});

	it("should handle single date", () => {
		const dates = [new Date("2025-01-15T10:00:00.000Z")];
		const result = stringifyDateArray(dates);
		expect(result).toBe('["2025-01-15T10:00:00.000Z"]');
	});
});

describe("round-trip conversion", () => {
	it("should preserve dates through stringify and parse", () => {
		const original = [
			new Date("2025-01-15T10:00:00.000Z"),
			new Date("2025-01-22T10:00:00.000Z"),
			new Date("2025-01-29T10:00:00.000Z"),
		];
		const stringified = stringifyDateArray(original);
		expect(stringified).toBeDefined();
		if (!stringified) throw new Error("stringified is undefined");
		const parsed = parseDateArray(stringified, "RDATE");
		expect(parsed).toHaveLength(3);
		expect(parsed[0].toISOString()).toBe(original[0].toISOString());
		expect(parsed[1].toISOString()).toBe(original[1].toISOString());
		expect(parsed[2].toISOString()).toBe(original[2].toISOString());
	});
});
