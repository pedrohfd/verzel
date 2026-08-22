import { apiClient } from "@/api/client";
import type { CinemaRoom } from "@/api/types";

export interface CreateRoomInput {
	name: string;
	rows: number;
	columns: number;
}

export async function createRoom(input: CreateRoomInput) {
	const { data } = await apiClient.post<CinemaRoom>("/api/rooms", input);
	return data;
}
