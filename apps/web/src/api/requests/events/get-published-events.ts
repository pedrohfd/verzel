import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export interface GetPublishedEventsFilters {
	search?: string;
	tmdbMovieId?: number;
	organizerId?: string;
	date?: string;
	venue?: string;
	priceMin?: number;
	priceMax?: number;
}

export async function getPublishedEvents(
	filters: GetPublishedEventsFilters = {},
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<{ results: VerzelEvent[] }>(
		"/api/events",
		{ params: filters, signal },
	);
	return data.results;
}
