import { apiClient } from "@/api/client";
import type { MovieTrailer } from "@/api/types";

export async function getMovieTrailers(movieId: number, signal?: AbortSignal) {
	const { data } = await apiClient.get<{ trailers: MovieTrailer[] }>(
		`/api/movies/${movieId}/trailer`,
		{ signal },
	);
	return data.trailers;
}
