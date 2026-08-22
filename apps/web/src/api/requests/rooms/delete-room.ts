import { apiClient } from "@/api/client";

export async function deleteRoom(roomId: string) {
	await apiClient.delete(`/api/rooms/${roomId}`);
}
