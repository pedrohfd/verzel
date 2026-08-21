import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

const { default: EventCard } = await import("./event-card");

const baseEvent = {
	id: "event-1",
	movieTitle: "Some Movie",
	moviePosterPath: "/poster.jpg",
	sessionAt: new Date("2030-01-01T22:00:00Z").toISOString(),
	venueName: "Venue",
	priceCents: 2500,
} as import("@/api/types").VerzelEvent;

describe("EventCard", () => {
	it("renders the event details", () => {
		render(<EventCard event={baseEvent} />);

		expect(screen.getByText("Some Movie")).toBeInTheDocument();
		expect(screen.getByText("Venue")).toBeInTheDocument();
		expect(screen.getByAltText("Some Movie")).toBeInTheDocument();
	});

	it("omits the poster image when there is no poster path", () => {
		render(<EventCard event={{ ...baseEvent, moviePosterPath: null }} />);

		expect(screen.queryByAltText("Some Movie")).not.toBeInTheDocument();
	});
});
