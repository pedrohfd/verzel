import { apiClient } from "@/api/client";
import type { Reservation } from "@/api/types";

export async function createReservation(eventId: string, seatId: string) {
	const { data } = await apiClient.post<Reservation>("/api/reservations", {
		eventId,
		seatId,
	});
	return data;
}
