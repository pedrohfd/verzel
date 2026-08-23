import { apiClient } from "@/api/client";
import type { Payment, TicketWithCode } from "@/api/types";

export async function processPayment(
	reservationIds: string[],
	simulateOutcome: "approve" | "decline",
) {
	const { data } = await apiClient.post<{
		payments: Payment[];
		tickets: TicketWithCode[];
	}>("/api/payments", { reservationIds, simulateOutcome });
	return data;
}
