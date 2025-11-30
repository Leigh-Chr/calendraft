/**
 * Tests for alarm duration parsing and formatting functions
 */

import { describe, expect, it } from "vitest";
import { formatDuration, parseDuration } from "../alarm-parser";

describe("parseDuration", () => {
	describe("minutes", () => {
		it("should parse negative minutes (before)", () => {
			const result = parseDuration("-PT15M");
			expect(result).toEqual({
				when: "before",
				value: 15,
				unit: "minutes",
			});
		});

		it("should parse positive minutes (after)", () => {
			const result = parseDuration("PT30M");
			expect(result).toEqual({
				when: "after",
				value: 30,
				unit: "minutes",
			});
		});

		it("should return null for zero minutes", () => {
			const result = parseDuration("PT0M");
			expect(result).toBeNull();
		});
	});

	describe("hours", () => {
		it("should parse negative hours (before)", () => {
			const result = parseDuration("-PT1H");
			expect(result).toEqual({
				when: "before",
				value: 1,
				unit: "hours",
			});
		});

		it("should parse positive hours (after)", () => {
			const result = parseDuration("PT2H");
			expect(result).toEqual({
				when: "after",
				value: 2,
				unit: "hours",
			});
		});

		it("should prefer hours over minutes", () => {
			const result = parseDuration("-PT1H30M");
			expect(result).toEqual({
				when: "before",
				value: 1,
				unit: "hours",
			});
		});
	});

	describe("days", () => {
		it("should parse negative days (before)", () => {
			const result = parseDuration("-P1D");
			expect(result).toEqual({
				when: "before",
				value: 1,
				unit: "days",
			});
		});

		it("should parse positive days (after)", () => {
			const result = parseDuration("P2D");
			expect(result).toEqual({
				when: "after",
				value: 2,
				unit: "days",
			});
		});

		it("should prefer days over hours and minutes", () => {
			const result = parseDuration("-P1DT2H30M");
			expect(result).toEqual({
				when: "before",
				value: 1,
				unit: "days",
			});
		});
	});

	describe("absolute time", () => {
		it("should recognize absolute time format", () => {
			const result = parseDuration("20250115T100000");
			expect(result).toEqual({
				when: "at",
				value: 0,
				unit: "minutes",
			});
		});

		it("should recognize absolute time with Z", () => {
			const result = parseDuration("20250115T100000Z");
			expect(result).toEqual({
				when: "at",
				value: 0,
				unit: "minutes",
			});
		});
	});

	describe("edge cases", () => {
		it("should return null for empty string", () => {
			const result = parseDuration("");
			expect(result).toBeNull();
		});

		it("should return null for invalid format", () => {
			const result = parseDuration("invalid");
			expect(result).toBeNull();
		});

		it("should handle format without P prefix", () => {
			const result = parseDuration("-T15M");
			expect(result).toEqual({
				when: "before",
				value: 15,
				unit: "minutes",
			});
		});
	});
});

describe("formatDuration", () => {
	describe("minutes", () => {
		it("should format before minutes", () => {
			const result = formatDuration("before", 15, "minutes");
			expect(result).toBe("-PT15M");
		});

		it("should format after minutes", () => {
			const result = formatDuration("after", 30, "minutes");
			expect(result).toBe("PT30M");
		});
	});

	describe("hours", () => {
		it("should format before hours", () => {
			const result = formatDuration("before", 1, "hours");
			expect(result).toBe("-PT1H");
		});

		it("should format after hours", () => {
			const result = formatDuration("after", 2, "hours");
			expect(result).toBe("PT2H");
		});
	});

	describe("days", () => {
		it("should format before days", () => {
			const result = formatDuration("before", 1, "days");
			expect(result).toBe("-P1D");
		});

		it("should format after days", () => {
			const result = formatDuration("after", 2, "days");
			expect(result).toBe("P2D");
		});
	});

	describe("absolute time (at)", () => {
		it('should return empty string for "at"', () => {
			const result = formatDuration("at", 0, "minutes");
			expect(result).toBe("");
		});
	});
});

describe("round-trip conversion", () => {
	it("should preserve -PT15M", () => {
		const parsed = parseDuration("-PT15M");
		expect(parsed).toBeDefined();
		if (!parsed) return;
		const formatted = formatDuration(parsed.when, parsed.value, parsed.unit);
		expect(formatted).toBe("-PT15M");
	});

	it("should preserve PT1H", () => {
		const parsed = parseDuration("PT1H");
		expect(parsed).toBeDefined();
		if (!parsed) return;
		const formatted = formatDuration(parsed.when, parsed.value, parsed.unit);
		expect(formatted).toBe("PT1H");
	});

	it("should preserve -P2D", () => {
		const parsed = parseDuration("-P2D");
		expect(parsed).toBeDefined();
		if (!parsed) return;
		const formatted = formatDuration(parsed.when, parsed.value, parsed.unit);
		expect(formatted).toBe("-P2D");
	});
});
