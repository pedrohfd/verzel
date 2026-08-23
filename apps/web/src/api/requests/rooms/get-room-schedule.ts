import { apiClient } from "@/api/client";

export interface RoomScheduleSlot {
	sessionAt: string;
	durationMinutes: number;
}

export async function getRoomSchedule(
	roomId: string,
	options?: { excludeEventId?: string; signal?: AbortSignal },
) {
	const { data } = await apiClient.get<{ results: RoomScheduleSlot[] }>(
		`/api/rooms/${roomId}/schedule`,
		{
			params: options?.excludeEventId
				? { excludeEventId: options.excludeEventId }
				: undefined,
			signal: options?.signal,
		},
	);
	return data.results;
}
