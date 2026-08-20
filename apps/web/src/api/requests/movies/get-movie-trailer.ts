import { apiClient } from "@/api/client";

export async function getMovieTrailer(movieId: number, signal?: AbortSignal) {
	const { data } = await apiClient.get<{ key: string | null }>(
		`/api/movies/${movieId}/trailer`,
		{ signal },
	);
	return data.key;
}
