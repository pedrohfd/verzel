import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

const getMovieDetails = vi.fn();
vi.mock("@/api/requests/movies/get-movie-details", () => ({
	getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
}));

const { default: EventCard } = await import("./event-card");

const baseEvent = {
	id: "event-1",
	tmdbMovieId: 1,
	movieTitle: "Some Movie",
	moviePosterPath: "/poster.jpg",
	sessionAt: new Date("2030-01-01T22:00:00Z").toISOString(),
	venueName: "Venue",
	priceCents: 2500,
} as import("@/api/types").VerzelEvent;

describe("EventCard", () => {
	it("renders the event details for a single session", () => {
		getMovieDetails.mockResolvedValue({ certification: "" });
		render(<EventCard event={baseEvent} sessionCount={1} />);

		expect(screen.getByText("Some Movie")).toBeInTheDocument();
		expect(screen.getByText("Venue")).toBeInTheDocument();
		expect(screen.getByAltText("Some Movie")).toBeInTheDocument();
		expect(screen.queryByText("Várias Sessões")).not.toBeInTheDocument();
	});

	it("omits the poster image when there is no poster path", () => {
		getMovieDetails.mockResolvedValue({ certification: "" });
		render(
			<EventCard
				event={{ ...baseEvent, moviePosterPath: null }}
				sessionCount={1}
			/>,
		);

		expect(screen.queryByAltText("Some Movie")).not.toBeInTheDocument();
	});

	it("shows 'Várias Sessões' and hides the venue when there is more than one session", () => {
		getMovieDetails.mockResolvedValue({ certification: "" });
		render(<EventCard event={baseEvent} sessionCount={3} />);

		expect(screen.getByText("Várias Sessões")).toBeInTheDocument();
		expect(screen.queryByText("Venue")).not.toBeInTheDocument();
	});

	it("shows the certification badge once movie details load", async () => {
		getMovieDetails.mockResolvedValue({ certification: "12" });
		render(<EventCard event={baseEvent} sessionCount={1} />);

		await waitFor(() => {
			expect(screen.getByText("12")).toBeInTheDocument();
		});
	});
});
