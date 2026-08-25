import { apiClient } from "@/api/client";

export async function getPublishedVenues(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: string[] }>(
		"/api/events/venues",
		{ signal },
	);
	return data.results;
}
