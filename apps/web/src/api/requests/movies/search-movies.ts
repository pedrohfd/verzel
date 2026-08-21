import { apiClient } from "@/api/client";
import type { TmdbMovie } from "@/api/types";

export async function searchMovies(query: string, signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: TmdbMovie[] }>(
		"/api/movies/search",
		{ params: { query }, signal },
	);
	return data.results;
}
