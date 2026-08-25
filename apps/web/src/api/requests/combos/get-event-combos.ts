import { apiClient } from "@/api/client";
import type { Combo } from "@/api/types";

export async function getEventCombos(eventId: string, signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: Combo[] }>(
		`/api/combos/for-event/${eventId}`,
		{ signal },
	);
	return data.results;
}
