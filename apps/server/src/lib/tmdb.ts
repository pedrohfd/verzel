import { env } from "@verzel/env/server";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export class TmdbError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "TmdbError";
	}
}

async function fetchTmdb<T>(
	path: string,
	searchParams?: Record<string, string>,
): Promise<T> {
	const url = new URL(`${TMDB_BASE_URL}${path}`);
	for (const [key, value] of Object.entries(searchParams ?? {})) {
		url.searchParams.set(key, value);
	}

	const response = await fetch(url, {
		headers: {
			Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}`,
			accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new TmdbError(
			`TMDB request to ${path} failed: ${response.statusText}`,
			response.status,
		);
	}

	return (await response.json()) as T;
}

export interface TmdbMovie {
	id: number;
	title: string;
	overview: string;
	poster_path: string | null;
	release_date: string;
	vote_average: number;
}

interface TmdbTrendingResponse {
	page: number;
	results: TmdbMovie[];
	total_pages: number;
	total_results: number;
}

export function getTrendingMovies(timeWindow: "day" | "week" = "week") {
	return fetchTmdb<TmdbTrendingResponse>(`/trending/movie/${timeWindow}`);
}
