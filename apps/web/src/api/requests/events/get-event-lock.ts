import { apiClient } from "@/api/client";

export async function getEventLock(eventId: string, signal?: AbortSignal) {
	const { data } = await apiClient.get<{ locked: boolean }>(
		`/api/events/${eventId}/lock`,
		{ signal },
	);
	return data;
}
