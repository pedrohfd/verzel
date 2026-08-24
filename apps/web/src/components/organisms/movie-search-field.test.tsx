import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { searchMovies } from "@/api/requests/movies/search-movies";
import type { TmdbMovie } from "@/api/types";

vi.mock("@/api/requests/movies/search-movies", () => ({
	searchMovies: vi.fn(),
}));

import MovieSearchField from "./movie-search-field";

const movie: TmdbMovie = {
	id: 1,
	title: "Some Movie",
	poster_path: null,
	backdrop_path: null,
	release_date: "2024-01-01",
	vote_average: 8,
};

describe("MovieSearchField", () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it("shows the selected movie with a change button", () => {
		render(<MovieSearchField value={movie} onChange={vi.fn()} />);

		expect(screen.getByText("Some Movie")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Trocar" })).toBeInTheDocument();
	});

	it("calls onChange with null when the change button is clicked", async () => {
		const onChange = vi.fn();
		const user = userEvent.setup();
		render(<MovieSearchField value={movie} onChange={onChange} />);

		await user.click(screen.getByRole("button", { name: "Trocar" }));

		expect(onChange).toHaveBeenCalledWith(null);
	});

	it("searches for movies as the user types and lists results", async () => {
		vi.mocked(searchMovies).mockResolvedValue([movie]);
		const user = userEvent.setup();
		render(<MovieSearchField value={null} onChange={vi.fn()} />);

		await user.type(
			screen.getByPlaceholderText("Buscar filme no TMDb..."),
			"Some",
		);

		await waitFor(() => {
			expect(searchMovies).toHaveBeenCalledWith("Some", expect.anything());
		});
		expect(await screen.findByText("Some Movie")).toBeInTheDocument();
	});

	it("calls onChange with the selected result and clears the search", async () => {
		vi.mocked(searchMovies).mockResolvedValue([movie]);
		const onChange = vi.fn();
		const user = userEvent.setup();
		render(<MovieSearchField value={null} onChange={onChange} />);

		const input = screen.getByPlaceholderText("Buscar filme no TMDb...");
		await user.type(input, "Some");
		await user.click(await screen.findByText("Some Movie"));

		expect(onChange).toHaveBeenCalledWith(movie);
	});
});
