import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export interface GetCheckinEventsFilters {
	date?: string;
}

export async function getCheckinEvents(
	filters: GetCheckinEventsFilters = {},
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<{ results: VerzelEvent[] }>(
		"/api/checkin/events",
		{ params: filters, signal },
	);
	return data.results;
}
