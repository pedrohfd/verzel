import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	getMovieTrailers,
	getNowPlayingMovies,
	getNowPlayingMoviesEnriched,
	getTrendingMovies,
	searchMovies,
	TmdbError,
} from "./tmdb";

function jsonResponse(body: unknown, ok = true, status = 200) {
	return {
		ok,
		status,
		statusText: "status",
		json: async () => body,
	} as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("getTrendingMovies", () => {
	it("returns the parsed TMDB response", async () => {
		const body = { page: 1, results: [], total_pages: 1, total_results: 0 };
		fetchMock.mockResolvedValue(jsonResponse(body));

		await expect(getTrendingMovies()).resolves.toEqual(body);
	});

	it("throws TmdbError when the request fails", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

		await expect(getTrendingMovies()).rejects.toBeInstanceOf(TmdbError);
	});
});

describe("getNowPlayingMovies", () => {
	it("returns the parsed TMDB response", async () => {
		const body = { page: 1, results: [], total_pages: 1, total_results: 0 };
		fetchMock.mockResolvedValue(jsonResponse(body));

		await expect(getNowPlayingMovies()).resolves.toEqual(body);
	});
});

describe("searchMovies", () => {
	it("returns the parsed TMDB response", async () => {
		const body = { page: 1, results: [], total_pages: 1, total_results: 0 };
		fetchMock.mockResolvedValue(jsonResponse(body));

		await expect(searchMovies("matrix")).resolves.toEqual(body);
	});
});

describe("getMovieTrailers", () => {
	it("prefers official YouTube trailers in pt-BR, deduped, capped at 3", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({
				results: [
					{
						key: "a",
						name: "A",
						site: "YouTube",
						type: "Trailer",
						official: true,
					},
					{
						key: "a",
						name: "A dup",
						site: "YouTube",
						type: "Trailer",
						official: true,
					},
					{
						key: "b",
						name: "B",
						site: "YouTube",
						type: "Trailer",
						official: true,
					},
					{
						key: "c",
						name: "C",
						site: "YouTube",
						type: "Trailer",
						official: true,
					},
					{
						key: "d",
						name: "D",
						site: "YouTube",
						type: "Trailer",
						official: true,
					},
					{
						key: "e",
						name: "E",
						site: "Vimeo",
						type: "Trailer",
						official: true,
					},
				],
			}),
		);

		const result = await getMovieTrailers(1);

		expect(result).toEqual([
			{ key: "a", name: "A" },
			{ key: "b", name: "B" },
			{ key: "c", name: "C" },
		]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("falls back to the language-agnostic videos when pt-BR has none", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ results: [] }))
			.mockResolvedValueOnce(
				jsonResponse({
					results: [
						{
							key: "z",
							name: "Z",
							site: "YouTube",
							type: "Trailer",
							official: true,
						},
					],
				}),
			);

		const result = await getMovieTrailers(1);

		expect(result).toEqual([{ key: "z", name: "Z" }]);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});

describe("getNowPlayingMoviesEnriched", () => {
	it("enriches now-playing movies with genre, runtime and certification", async () => {
		const movie = {
			id: 1,
			title: "Movie",
			poster_path: null,
			backdrop_path: null,
			vote_average: 8,
			release_date: "2024-01-01",
			overview: "",
		};

		fetchMock.mockImplementation(async (url: URL) => {
			const path = url.pathname;
			if (path === "/3/movie/now_playing") {
				return jsonResponse({
					page: 1,
					results: [movie],
					total_pages: 1,
					total_results: 1,
				});
			}
			if (path === "/3/movie/1") {
				return jsonResponse({
					genres: [{ id: 1, name: "Action" }],
					runtime: 120,
				});
			}
			if (path === "/3/movie/1/release_dates") {
				return jsonResponse({
					results: [
						{
							iso_3166_1: "BR",
							release_dates: [{ certification: "14" }],
						},
					],
				});
			}
			throw new Error(`unexpected path: ${path}`);
		});

		const result = await getNowPlayingMoviesEnriched(1);

		expect(result).toEqual([
			{
				id: 1,
				title: "Movie",
				poster_path: null,
				backdrop_path: null,
				vote_average: 8,
				genre: "Action",
				runtime: 120,
				certification: "14",
				audio: "Dublado",
			},
		]);
	});

	it("defaults certification to Livre when Brazil has none", async () => {
		const movie = {
			id: 2,
			title: "Movie 2",
			poster_path: null,
			backdrop_path: null,
			vote_average: 7,
			release_date: "2024-01-01",
			overview: "",
		};

		fetchMock.mockImplementation(async (url: URL) => {
			const path = url.pathname;
			if (path === "/3/movie/now_playing") {
				return jsonResponse({
					page: 1,
					results: [movie],
					total_pages: 1,
					total_results: 1,
				});
			}
			if (path === "/3/movie/2") {
				return jsonResponse({ genres: [], runtime: null });
			}
			if (path === "/3/movie/2/release_dates") {
				return jsonResponse({ results: [] });
			}
			throw new Error(`unexpected path: ${path}`);
		});

		const [result] = await getNowPlayingMoviesEnriched(1);

		expect(result?.certification).toBe("Livre");
		expect(result?.genre).toBeNull();
	});
});
