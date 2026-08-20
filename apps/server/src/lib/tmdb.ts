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
	backdrop_path: string | null;
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
	return fetchTmdb<TmdbTrendingResponse>(`/trending/movie/${timeWindow}`, {
		language: "pt-BR",
	});
}

interface TmdbNowPlayingResponse {
	page: number;
	results: TmdbMovie[];
	total_pages: number;
	total_results: number;
}

export function getNowPlayingMovies() {
	return fetchTmdb<TmdbNowPlayingResponse>("/movie/now_playing", {
		language: "pt-BR",
		region: "BR",
	});
}

interface TmdbMovieDetails {
	genres: { id: number; name: string }[];
	runtime: number | null;
}

function getMovieDetails(id: number) {
	return fetchTmdb<TmdbMovieDetails>(`/movie/${id}`, { language: "pt-BR" });
}

interface TmdbReleaseDatesResponse {
	results: {
		iso_3166_1: string;
		release_dates: { certification: string }[];
	}[];
}

async function getMovieCertification(id: number): Promise<string> {
	const { results } = await fetchTmdb<TmdbReleaseDatesResponse>(
		`/movie/${id}/release_dates`,
	);
	const br = results.find((entry) => entry.iso_3166_1 === "BR");
	const certification = br?.release_dates.find(
		(release) => release.certification,
	)?.certification;
	return certification || "Livre";
}

export interface EnrichedMovie {
	id: number;
	title: string;
	poster_path: string | null;
	backdrop_path: string | null;
	vote_average: number;
	genre: string | null;
	runtime: number | null;
	certification: string;
	// TMDB has no dubbed/subtitled flag; mainstream releases in Brazilian
	// theaters are shown dubbed by default, so this is a fixed value.
	audio: "Dublado";
}

export async function getNowPlayingMoviesEnriched(
	limit = 5,
): Promise<EnrichedMovie[]> {
	const { results } = await getNowPlayingMovies();
	const top = results.slice(0, limit);

	return Promise.all(
		top.map(async (movie) => {
			const [details, certification] = await Promise.all([
				getMovieDetails(movie.id),
				getMovieCertification(movie.id),
			]);

			return {
				id: movie.id,
				title: movie.title,
				poster_path: movie.poster_path,
				backdrop_path: movie.backdrop_path,
				vote_average: movie.vote_average,
				genre: details.genres[0]?.name ?? null,
				runtime: details.runtime,
				certification,
				audio: "Dublado",
			};
		}),
	);
}
