import { apiClient } from "@/api/client";
import type { CinemaRoom } from "@/api/types";

export async function getMyRooms(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: CinemaRoom[] }>(
		"/api/rooms/mine",
		{ signal },
	);
	return data.results;
}
