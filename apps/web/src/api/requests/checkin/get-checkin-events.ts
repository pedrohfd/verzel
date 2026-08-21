import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export async function getCheckinEvents(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: VerzelEvent[] }>(
		"/api/checkin/events",
		{ signal },
	);
	return data.results;
}
