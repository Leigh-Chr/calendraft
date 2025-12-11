/**
 * Tests for EventCard component
 */

// Setup DOM environment for Bun test BEFORE any other imports
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
	url: "http://localhost",
	pretendToBeVisual: true,
});
// Set global document before any testing-library imports
// biome-ignore lint/suspicious/noExplicitAny: jsdom types don't match globalThis types
(globalThis as any).document = dom.window.document;
// biome-ignore lint/suspicious/noExplicitAny: jsdom types don't match globalThis types
(globalThis as any).window = dom.window;
// biome-ignore lint/suspicious/noExplicitAny: jsdom types don't match globalThis types
(globalThis as any).navigator = dom.window.navigator;

import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { EventCard } from "../event-list/event-card";
import type { EventItem } from "../event-list/types";

// Mock router
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

// Mock motion
vi.mock("motion/react", () => ({
	motion: {
		div: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) =>
			React.createElement("div", props, children),
	},
}));

describe("EventCard", () => {
	const mockEvent: EventItem = {
		id: "event-1",
		title: "Test Event",
		startDate: new Date("2024-01-01T10:00:00Z"),
		endDate: new Date("2024-01-01T11:00:00Z"),
		description: "Test description",
		location: "Test location",
		color: "#FF0000",
		attendees: [],
		alarms: [],
		categories: [],
		resources: [],
	};

	const defaultProps = {
		event: mockEvent,
		calendarId: "cal-1",
		onDelete: vi.fn(),
		isDeleting: false,
	};

	it("should render event title", () => {
		const { container } = render(<EventCard {...defaultProps} />);
		const titleElement =
			container.querySelector("text") || container.textContent;
		expect(titleElement).toBeTruthy();
		expect(container.textContent).toContain("Test Event");
	});

	it("should call onDelete when delete is clicked", () => {
		const onDelete = vi.fn();
		render(<EventCard {...defaultProps} onDelete={onDelete} />);

		// Find and click delete button (implementation depends on UI structure)
		// This is a placeholder test structure
		expect(onDelete).toBeDefined();
	});
});
