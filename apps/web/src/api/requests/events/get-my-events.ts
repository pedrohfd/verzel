import { apiClient } from "@/api/client";
import type { EventStatus, VerzelEvent } from "@/api/types";

export interface GetMyEventsFilters {
	status?: EventStatus;
	q?: string;
}

export async function getMyEvents(
	filters: GetMyEventsFilters = {},
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<{ results: VerzelEvent[] }>(
		"/api/events/mine",
		{ params: filters, signal },
	);
	return data.results;
}
