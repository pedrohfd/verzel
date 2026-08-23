import { apiClient } from "@/api/client";
import type { Reservation } from "@/api/types";

export async function createReservation(
	eventId: string,
	seats: { row: number; column: number }[],
) {
	const { data } = await apiClient.post<Reservation[]>("/api/reservations", {
		eventId,
		seats,
	});
	return data;
}
