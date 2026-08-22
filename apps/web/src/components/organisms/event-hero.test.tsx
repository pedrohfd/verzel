import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMovieTrailersMock } = vi.hoisted(() => ({
	getMovieTrailersMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

vi.mock("@/api/requests/movies/get-movie-trailers", () => ({
	getMovieTrailers: getMovieTrailersMock,
}));

const { default: EventHero } = await import("./event-hero");

const events = [
	{
		id: "1",
		movieTitle: "Movie One",
		movieBackdropPath: "/one.jpg",
		sessionAt: new Date("2030-01-01T22:00:00Z").toISOString(),
		venueName: "Venue One",
		priceCents: 1000,
		tmdbMovieId: 1,
	},
	{
		id: "2",
		movieTitle: "Movie Two",
		movieBackdropPath: "/two.jpg",
		sessionAt: new Date("2030-01-02T22:00:00Z").toISOString(),
		venueName: "Venue Two",
		priceCents: 2000,
		tmdbMovieId: 2,
	},
] as unknown as import("@/api/types").VerzelEvent[];

beforeEach(() => {
	getMovieTrailersMock.mockReset();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("EventHero", () => {
	it("returns null when there are no events", () => {
		const { container } = render(<EventHero events={[]} />);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders the active event", () => {
		render(<EventHero events={events} />);

		expect(screen.getByText("Movie One")).toBeInTheDocument();
	});

	it("cycles through events automatically", () => {
		render(<EventHero events={events} />);

		act(() => {
			vi.advanceTimersByTime(6000);
		});

		expect(screen.getByText("Movie Two")).toBeInTheDocument();
	});

	it("navigates with the previous/next controls", () => {
		render(<EventHero events={events} />);

		fireEvent.click(screen.getByLabelText("Próxima sessão"));
		expect(screen.getByText("Movie Two")).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Sessão anterior"));
		expect(screen.getByText("Movie One")).toBeInTheDocument();
	});

	it("navigates via the dot indicators", () => {
		render(<EventHero events={events} />);

		fireEvent.click(screen.getByLabelText("Ver Movie Two"));

		expect(screen.getByText("Movie Two")).toBeInTheDocument();
	});

	it("plays the trailer and shows it once loaded", async () => {
		getMovieTrailersMock.mockResolvedValue([
			{ key: "abc", name: "Official Trailer" },
		]);

		render(<EventHero events={events} />);

		await act(async () => {
			fireEvent.click(screen.getByLabelText("Assistir trailer"));
		});

		expect(screen.getByTitle("Official Trailer")).toBeInTheDocument();
	});

	it("shows a fallback message when no trailer is available", async () => {
		getMovieTrailersMock.mockResolvedValue([]);

		render(<EventHero events={events} />);

		await act(async () => {
			fireEvent.click(screen.getByLabelText("Assistir trailer"));
		});

		expect(
			screen.getByText("Trailer não disponível para este filme."),
		).toBeInTheDocument();
	});

	it("clears the trailer state when navigating to another event", async () => {
		getMovieTrailersMock.mockResolvedValue([{ key: "abc", name: "Trailer" }]);
		render(<EventHero events={events} />);

		await act(async () => {
			fireEvent.click(screen.getByLabelText("Assistir trailer"));
		});
		expect(screen.getByTitle("Trailer")).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Próxima sessão"));

		expect(screen.queryByTitle("Trailer")).not.toBeInTheDocument();
	});
});
