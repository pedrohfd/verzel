import { apiClient } from "@/api/client";
import type { EnrichedMovie } from "@/api/types";

export async function getNowPlayingMovies(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: EnrichedMovie[] }>(
		"/api/movies/now-playing",
		{ signal },
	);
	return data.results;
}
