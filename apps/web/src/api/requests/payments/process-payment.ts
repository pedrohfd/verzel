import { apiClient } from "@/api/client";
import type { Payment, TicketWithCode } from "@/api/types";

export async function processPayment(
	reservationId: string,
	simulateOutcome: "approve" | "decline",
) {
	const { data } = await apiClient.post<{
		payment: Payment;
		ticket: TicketWithCode | null;
	}>("/api/payments", { reservationId, simulateOutcome });
	return data;
}
