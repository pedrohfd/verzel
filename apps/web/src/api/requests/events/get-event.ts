import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export async function getEvent(eventId: string, signal?: AbortSignal) {
	const { data } = await apiClient.get<VerzelEvent>(`/api/events/${eventId}`, {
		signal,
	});
	return data;
}
