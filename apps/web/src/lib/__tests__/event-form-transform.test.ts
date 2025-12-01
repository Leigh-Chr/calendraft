/**
 * Tests for event form data transformation functions
 */

import { describe, expect, it } from "vitest";
import {
	transformEventFormDataForUpdate,
	transformEventFormDataToAPI,
} from "../event-form-transform";
import type { EventFormData } from "../event-form-types";

describe("transformEventFormDataToAPI", () => {
	const testCalendarId = "test-calendar-123";
	const baseFormData: EventFormData = {
		title: "Test Event",
		startDate: "2025-01-15T10:00",
		endDate: "2025-01-15T11:00",
	};

	describe("basic transformation", () => {
		it("should transform required fields", () => {
			const result = transformEventFormDataToAPI(baseFormData, testCalendarId);
			expect(result.title).toBe("Test Event");
			expect(result.startDate).toBeInstanceOf(Date);
			expect(result.endDate).toBeInstanceOf(Date);
			// Dates are parsed as local time, so we check the date parts match
			expect(result.startDate.getFullYear()).toBe(2025);
			expect(result.startDate.getMonth()).toBe(0); // January (0-indexed)
			expect(result.startDate.getDate()).toBe(15);
			expect(result.startDate.getHours()).toBe(10);
			expect(result.startDate.getMinutes()).toBe(0);
		});

		it("should include optional location", () => {
			const formData = { ...baseFormData, location: "Meeting Room A" };
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.location).toBe("Meeting Room A");
		});

		it("should include optional description", () => {
			const formData = { ...baseFormData, description: "Important meeting" };
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.description).toBe("Important meeting");
		});

		it("should exclude undefined optional fields", () => {
			const result = transformEventFormDataToAPI(baseFormData, testCalendarId);
			expect(result.location).toBeUndefined();
			expect(result.description).toBeUndefined();
			expect(result.url).toBeUndefined();
		});
	});

	describe("status transformation", () => {
		it("should include valid status", () => {
			const formData = { ...baseFormData, status: "CONFIRMED" as const };
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.status).toBe("CONFIRMED");
		});

		it("should exclude invalid status", () => {
			const formData = { ...baseFormData, status: "INVALID" as never };
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.status).toBeUndefined();
		});
	});

	describe("organizer transformation", () => {
		it("should include organizer with name and email", () => {
			const formData = {
				...baseFormData,
				organizerName: "John Doe",
				organizerEmail: "john@example.com",
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.organizerName).toBe("John Doe");
			expect(result.organizerEmail).toBe("john@example.com");
		});

		it("should include organizer with only email", () => {
			const formData = {
				...baseFormData,
				organizerEmail: "john@example.com",
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.organizerName).toBeUndefined();
			expect(result.organizerEmail).toBe("john@example.com");
		});

		it("should exclude organizer if both are undefined", () => {
			const result = transformEventFormDataToAPI(baseFormData, testCalendarId);
			expect(result.organizerName).toBeUndefined();
			expect(result.organizerEmail).toBeUndefined();
		});
	});

	describe("attendees transformation", () => {
		it("should transform attendees with all fields", () => {
			const formData = {
				...baseFormData,
				attendees: [
					{
						email: "attendee1@example.com",
						name: "Alice",
						role: "REQ_PARTICIPANT",
						status: "ACCEPTED",
						rsvp: true,
					},
				],
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.attendees).toEqual([
				{
					email: "attendee1@example.com",
					name: "Alice",
					role: "REQ_PARTICIPANT",
					status: "ACCEPTED",
					rsvp: true,
				},
			]);
		});

		it("should transform attendees with minimal fields", () => {
			const formData = {
				...baseFormData,
				attendees: [
					{
						email: "attendee1@example.com",
					},
				],
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.attendees).toEqual([
				{
					email: "attendee1@example.com",
					name: null,
					role: null,
					status: null,
					rsvp: false,
				},
			]);
		});

		it("should include all attendees even with empty email", () => {
			const formData = {
				...baseFormData,
				attendees: [
					{
						email: "attendee1@example.com",
						name: "Alice",
					},
					{
						email: "",
					},
				],
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.attendees).toHaveLength(2);
			expect(result.attendees?.[0].email).toBe("attendee1@example.com");
		});

		it("should include empty attendees array", () => {
			const formData = { ...baseFormData, attendees: [] };
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.attendees).toEqual([]);
		});
	});

	describe("alarms transformation", () => {
		it("should transform alarms with all fields", () => {
			const formData = {
				...baseFormData,
				alarms: [
					{
						action: "DISPLAY",
						trigger: "-PT15M",
						summary: "Reminder",
						description: "Meeting in 15 minutes",
						duration: "PT5M",
						repeat: 2,
					},
				],
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.alarms).toEqual([
				{
					action: "DISPLAY",
					trigger: "-PT15M",
					summary: "Reminder",
					description: "Meeting in 15 minutes",
					duration: "PT5M",
					repeat: 2,
				},
			]);
		});

		it("should include empty alarms array", () => {
			const formData = { ...baseFormData, alarms: [] };
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.alarms).toEqual([]);
		});
	});

	describe("edge cases", () => {
		it("should handle empty strings", () => {
			const formData = {
				...baseFormData,
				location: "",
				description: "",
				url: "",
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.location).toBeUndefined();
			expect(result.description).toBeUndefined();
			expect(result.url).toBeUndefined();
		});

		it("should handle null values", () => {
			const formData = {
				...baseFormData,
				location: null as never,
				description: null as never,
			};
			const result = transformEventFormDataToAPI(formData, testCalendarId);
			expect(result.location).toBeUndefined();
			expect(result.description).toBeUndefined();
		});
	});
});

describe("transformEventFormDataForUpdate", () => {
	const testCalendarId = "test-calendar-123";
	const baseFormData: EventFormData = {
		title: "Updated Event",
		startDate: "2025-01-15T10:00",
		endDate: "2025-01-15T11:00",
	};

	it("should transform basic fields for update", () => {
		const result = transformEventFormDataForUpdate(baseFormData);
		expect(result.title).toBe("Updated Event");
		expect(result.startDate).toBeInstanceOf(Date);
		expect(result.endDate).toBeInstanceOf(Date);
		// Dates are parsed as local time, so we check the date parts match
		expect(result.startDate.getFullYear()).toBe(2025);
		expect(result.startDate.getMonth()).toBe(0); // January (0-indexed)
		expect(result.startDate.getDate()).toBe(15);
		expect(result.startDate.getHours()).toBe(10);
		expect(result.startDate.getMinutes()).toBe(0);
	});

	it("should include all optional fields", () => {
		const formData = {
			...baseFormData,
			location: "New Location",
			description: "Updated description",
			url: "https://example.com",
			status: "CONFIRMED" as const,
			class: "PUBLIC" as const,
			transp: "OPAQUE" as const,
			priority: 5,
		};
		const result = transformEventFormDataForUpdate(formData);
		expect(result.location).toBe("New Location");
		expect(result.description).toBe("Updated description");
		expect(result.url).toBe("https://example.com");
		expect(result.status).toBe("CONFIRMED");
		expect(result.class).toBe("PUBLIC");
		expect(result.transp).toBe("OPAQUE");
		expect(result.priority).toBe(5);
	});

	it("should use similar transformation as create but with null instead of undefined", () => {
		const formData = {
			...baseFormData,
			organizerName: "Jane Doe",
			organizerEmail: "jane@example.com",
			attendees: [{ email: "test@example.com", name: "Test" }],
		};
		const createResult = transformEventFormDataToAPI(formData, testCalendarId);
		const updateResult = transformEventFormDataForUpdate(formData);
		expect(updateResult.organizerName).toBe(createResult.organizerName);
		expect(updateResult.organizerEmail).toBe(createResult.organizerEmail);
		expect(updateResult.attendees).toEqual(createResult.attendees);
	});
});
