import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMovieDetailsMock } = vi.hoisted(() => ({
	getMovieDetailsMock: vi.fn(),
}));

vi.mock("@/api/requests/movies/get-movie-details", () => ({
	getMovieDetails: getMovieDetailsMock,
}));

const { default: EventInfo } = await import("./event-info");

const event = {
	id: "1",
	tmdbMovieId: 42,
	movieTitle: "Wicked",
	moviePosterPath: "/poster.jpg",
	sessionAt: new Date("2030-01-01T22:00:00Z").toISOString(),
	venueName: "CineBase Shopping Center",
	venueAddress: "Av. Principal, 100",
} as unknown as import("@/api/types").VerzelEvent;

beforeEach(() => {
	getMovieDetailsMock.mockReset();
});

describe("EventInfo", () => {
	it("renders the movie title immediately", () => {
		getMovieDetailsMock.mockResolvedValue(
			new Promise(() => {
				// never resolves
			}),
		);

		render(<EventInfo event={event} />);

		expect(screen.getByText("Wicked")).toBeInTheDocument();
	});

	it("shows a poster placeholder when there is no poster path", () => {
		getMovieDetailsMock.mockResolvedValue(
			new Promise(() => {
				// never resolves
			}),
		);

		render(<EventInfo event={{ ...event, moviePosterPath: null }} />);

		expect(screen.getByText("Pôster do filme")).toBeInTheDocument();
	});

	it("renders genre, certification and runtime badges once details load", async () => {
		getMovieDetailsMock.mockResolvedValue({
			genre: "Musical",
			certification: "10 anos",
			runtime: 160,
			overview: "A história nunca contada das bruxas de Oz.",
			director: "Jon M. Chu",
			cast: ["Cynthia Erivo", "Ariana Grande"],
		});

		await act(async () => {
			render(<EventInfo event={event} />);
		});

		expect(screen.getByText("Musical")).toBeInTheDocument();
		expect(screen.getByText("10 anos")).toBeInTheDocument();
		expect(screen.getByText("160min")).toBeInTheDocument();
		expect(
			screen.getByText("A história nunca contada das bruxas de Oz."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Direção: Jon M. Chu · Elenco: Cynthia Erivo, Ariana Grande",
			),
		).toBeInTheDocument();
	});

	it("omits the credits line when director and cast are missing", async () => {
		getMovieDetailsMock.mockResolvedValue({
			genre: "Musical",
			certification: "10 anos",
			runtime: 160,
			overview: "Sinopse.",
			director: null,
			cast: [],
		});

		await act(async () => {
			render(<EventInfo event={event} />);
		});

		expect(screen.queryByText(/Direção:/)).not.toBeInTheDocument();
	});

	it("does not render badges when the details request fails", async () => {
		getMovieDetailsMock.mockRejectedValue(new Error("boom"));

		await act(async () => {
			render(<EventInfo event={event} />);
		});

		expect(screen.queryByText("Musical")).not.toBeInTheDocument();
	});
});
