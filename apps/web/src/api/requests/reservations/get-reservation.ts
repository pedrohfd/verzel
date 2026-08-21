import { apiClient } from "@/api/client";
import type { Reservation } from "@/api/types";

export async function getReservation(
	reservationId: string,
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<Reservation>(
		`/api/reservations/${reservationId}`,
		{ signal },
	);
	return data;
}
