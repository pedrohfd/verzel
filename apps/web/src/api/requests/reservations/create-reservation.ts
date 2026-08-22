import { apiClient } from "@/api/client";
import type { Reservation } from "@/api/types";

export async function createReservation(
	eventId: string,
	row: number,
	column: number,
) {
	const { data } = await apiClient.post<Reservation>("/api/reservations", {
		eventId,
		row,
		column,
	});
	return data;
}
