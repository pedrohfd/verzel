import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export async function getPublishedEvents(
	search?: string,
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<{ results: VerzelEvent[] }>(
		"/api/events",
		{ params: search ? { search } : undefined, signal },
	);
	return data.results;
}
