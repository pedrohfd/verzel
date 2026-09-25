import { apiClient } from "@/api/client";

export async function getActiveHoldCount(
	eventId: string,
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<{ count: number; limit: number }>(
		"/api/reservations/active-count",
		{ params: { eventId }, signal },
	);
	return data;
}
