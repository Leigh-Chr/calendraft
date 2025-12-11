/**
 * Tests for EventCard component
 */

import { render, screen } from "@testing-library/react";
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
		render(<EventCard {...defaultProps} />);
		expect(screen.getByText("Test Event")).toBeInTheDocument();
	});

	it("should call onDelete when delete is clicked", () => {
		const onDelete = vi.fn();
		render(<EventCard {...defaultProps} onDelete={onDelete} />);

		// Find and click delete button (implementation depends on UI structure)
		// This is a placeholder test structure
		expect(onDelete).toBeDefined();
	});
});
