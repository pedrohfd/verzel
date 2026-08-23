import { beforeEach, describe, expect, it, vi } from "vitest";

const {
	getTrendingMoviesMock,
	getNowPlayingMoviesEnrichedMock,
	searchMoviesMock,
	getMovieTrailersMock,
	getMovieFullDetailsMock,
} = vi.hoisted(() => ({
	getTrendingMoviesMock: vi.fn(),
	getNowPlayingMoviesEnrichedMock: vi.fn(),
	searchMoviesMock: vi.fn(),
	getMovieTrailersMock: vi.fn(),
	getMovieFullDetailsMock: vi.fn(),
}));

vi.mock("../lib/tmdb", async () => {
	const actual =
		await vi.importActual<typeof import("../lib/tmdb")>("../lib/tmdb");
	return {
		...actual,
		getTrendingMovies: getTrendingMoviesMock,
		getNowPlayingMoviesEnriched: getNowPlayingMoviesEnrichedMock,
		searchMovies: searchMoviesMock,
		getMovieTrailers: getMovieTrailersMock,
		getMovieFullDetails: getMovieFullDetailsMock,
	};
});

const { buildTestApp } = await import("../test-helpers/build-test-app");
const { TmdbError } = await import("../lib/tmdb");

beforeEach(() => {
	getTrendingMoviesMock.mockReset();
	getNowPlayingMoviesEnrichedMock.mockReset();
	searchMoviesMock.mockReset();
	getMovieTrailersMock.mockReset();
	getMovieFullDetailsMock.mockReset();
});

describe("GET /trending", () => {
	it("returns the trending movies payload", async () => {
		const body = { page: 1, results: [], total_pages: 1, total_results: 0 };
		getTrendingMoviesMock.mockResolvedValue(body);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/trending",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual(body);
	});

	it("returns 502 when TMDB fails", async () => {
		getTrendingMoviesMock.mockRejectedValue(new TmdbError("boom", 500));
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/trending",
		});

		expect(res.statusCode).toBe(502);
	});
});

describe("GET /now-playing", () => {
	it("returns the now-playing movies", async () => {
		getNowPlayingMoviesEnrichedMock.mockResolvedValue([]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/now-playing",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ results: [] });
	});
});

describe("GET /search", () => {
	it("returns an empty result set without hitting TMDB when query is missing", async () => {
		const app = buildTestApp();

		const res = await app.inject({ method: "GET", url: "/api/movies/search" });

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ results: [] });
		expect(searchMoviesMock).not.toHaveBeenCalled();
	});

	it("returns search results when a query is given", async () => {
		searchMoviesMock.mockResolvedValue({ results: [{ id: 1 }] });
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/search?query=matrix",
		});

		expect(res.json()).toEqual({ results: [{ id: 1 }] });
	});
});

describe("GET /:id/trailer", () => {
	it("returns the trailers for a movie", async () => {
		getMovieTrailersMock.mockResolvedValue([{ key: "a", name: "A" }]);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/1/trailer",
		});

		expect(res.json()).toEqual({ trailers: [{ key: "a", name: "A" }] });
	});
});

describe("GET /:id/details", () => {
	it("returns the full movie details", async () => {
		const details = {
			genre: "Musical",
			runtime: 160,
			certification: "10 anos",
			overview: "Sinopse.",
			director: "Jon M. Chu",
			cast: ["Cynthia Erivo", "Ariana Grande"],
		};
		getMovieFullDetailsMock.mockResolvedValue(details);
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/1/details",
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual(details);
	});

	it("returns 502 when TMDB fails", async () => {
		getMovieFullDetailsMock.mockRejectedValue(new TmdbError("boom", 500));
		const app = buildTestApp();

		const res = await app.inject({
			method: "GET",
			url: "/api/movies/1/details",
		});

		expect(res.statusCode).toBe(502);
	});
});
