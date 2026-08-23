import { apiClient } from "@/api/client";

export async function cancelReservations(reservationIds: string[]) {
	await apiClient.post("/api/reservations/cancel", { reservationIds });
}
