import { apiClient } from "@/api/client";
import type { Seat } from "@/api/types";

export async function getEventSeats(eventId: string, signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: Seat[] }>(
		`/api/events/${eventId}/seats`,
		{ signal },
	);
	return data.results;
}
