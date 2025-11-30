/**
 * Tests for deep equality comparison function
 */

import { describe, expect, it } from "vitest";
import { deepEqual } from "../deep-equal";

describe("deepEqual", () => {
	describe("primitives", () => {
		it("should compare numbers", () => {
			expect(deepEqual(1, 1)).toBe(true);
			expect(deepEqual(1, 2)).toBe(false);
		});

		it("should compare strings", () => {
			expect(deepEqual("hello", "hello")).toBe(true);
			expect(deepEqual("hello", "world")).toBe(false);
		});

		it("should compare booleans", () => {
			expect(deepEqual(true, true)).toBe(true);
			expect(deepEqual(true, false)).toBe(false);
		});

		it("should compare null and undefined", () => {
			expect(deepEqual(null, null)).toBe(true);
			expect(deepEqual(undefined, undefined)).toBe(true);
			expect(deepEqual(null, undefined)).toBe(false);
		});
	});

	describe("objects", () => {
		it("should compare simple objects", () => {
			expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
			expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
		});

		it("should compare objects with different keys", () => {
			expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
			expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		});

		it("should compare nested objects", () => {
			expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
				true,
			);
			expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
				false,
			);
		});

		it("should compare empty objects", () => {
			expect(deepEqual({}, {})).toBe(true);
		});
	});

	describe("arrays", () => {
		it("should compare simple arrays", () => {
			expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
			expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
		});

		it("should compare arrays with different lengths", () => {
			expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
			expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
		});

		it("should compare nested arrays", () => {
			expect(
				deepEqual(
					[
						[1, 2],
						[3, 4],
					],
					[
						[1, 2],
						[3, 4],
					],
				),
			).toBe(true);
			expect(
				deepEqual(
					[
						[1, 2],
						[3, 4],
					],
					[
						[1, 2],
						[3, 5],
					],
				),
			).toBe(false);
		});

		it("should compare empty arrays", () => {
			expect(deepEqual([], [])).toBe(true);
		});

		it("should compare arrays of objects", () => {
			expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true);
			expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(false);
		});
	});

	describe("dates", () => {
		it("should compare equal dates", () => {
			const date1 = new Date("2025-01-15T10:00:00.000Z");
			const date2 = new Date("2025-01-15T10:00:00.000Z");
			expect(deepEqual(date1, date2)).toBe(true);
		});

		it("should compare different dates", () => {
			const date1 = new Date("2025-01-15T10:00:00.000Z");
			const date2 = new Date("2025-01-16T10:00:00.000Z");
			expect(deepEqual(date1, date2)).toBe(false);
		});

		it("should compare dates with millisecond precision", () => {
			const date1 = new Date("2025-01-15T10:00:00.123Z");
			const date2 = new Date("2025-01-15T10:00:00.124Z");
			expect(deepEqual(date1, date2)).toBe(false);
		});
	});

	describe("mixed types", () => {
		it("should return false for different types", () => {
			expect(deepEqual(1, "1")).toBe(false);
			expect(deepEqual({}, [])).toBe(false);
			expect(deepEqual(null, {})).toBe(false);
		});

		it("should compare complex nested structures", () => {
			const obj1 = {
				a: 1,
				b: [1, 2, { c: 3 }],
				d: { e: [4, 5] },
			};
			const obj2 = {
				a: 1,
				b: [1, 2, { c: 3 }],
				d: { e: [4, 5] },
			};
			const obj3 = {
				a: 1,
				b: [1, 2, { c: 3 }],
				d: { e: [4, 6] },
			};
			expect(deepEqual(obj1, obj2)).toBe(true);
			expect(deepEqual(obj1, obj3)).toBe(false);
		});
	});

	describe("same reference", () => {
		it("should return true for same object reference", () => {
			const obj = { a: 1, b: 2 };
			expect(deepEqual(obj, obj)).toBe(true);
		});

		it("should return true for same array reference", () => {
			const arr = [1, 2, 3];
			expect(deepEqual(arr, arr)).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle circular references (same object)", () => {
			const obj: { a: number; self?: unknown } = { a: 1 };
			obj.self = obj;
			expect(deepEqual(obj, obj)).toBe(true);
		});

		it("should compare objects with null values", () => {
			expect(deepEqual({ a: null }, { a: null })).toBe(true);
			expect(deepEqual({ a: null }, { a: 1 })).toBe(false);
		});

		it("should compare objects with undefined values", () => {
			expect(deepEqual({ a: undefined }, { a: undefined })).toBe(true);
			expect(deepEqual({ a: undefined }, { a: 1 })).toBe(false);
		});

		it("should handle objects with numeric keys", () => {
			expect(deepEqual({ 0: "a", 1: "b" }, { 0: "a", 1: "b" })).toBe(true);
			expect(deepEqual({ 0: "a", 1: "b" }, { 0: "a", 1: "c" })).toBe(false);
		});
	});
});
