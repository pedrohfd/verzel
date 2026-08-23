import { apiClient } from "@/api/client";
import type { MovieDetails } from "@/api/types";

export async function getMovieDetails(movieId: number, signal?: AbortSignal) {
	const { data } = await apiClient.get<MovieDetails>(
		`/api/movies/${movieId}/details`,
		{ signal },
	);
	return data;
}
