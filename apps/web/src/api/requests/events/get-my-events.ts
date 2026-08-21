import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export async function getMyEvents(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: VerzelEvent[] }>(
		"/api/events/mine",
		{ signal },
	);
	return data.results;
}
