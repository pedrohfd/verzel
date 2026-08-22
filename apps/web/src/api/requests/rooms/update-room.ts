import { apiClient } from "@/api/client";
import type { CinemaRoom } from "@/api/types";
import type { CreateRoomInput } from "./create-room";

export async function updateRoom(roomId: string, input: CreateRoomInput) {
	const { data } = await apiClient.patch<CinemaRoom>(
		`/api/rooms/${roomId}`,
		input,
	);
	return data;
}
