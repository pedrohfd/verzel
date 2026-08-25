import { apiClient } from "@/api/client";
import type { Payment, TicketWithCode } from "@/api/types";

export interface ComboItemInput {
	comboId: string;
	quantity: number;
}

export async function processPayment(
	reservationIds: string[],
	simulateOutcome: "approve" | "decline",
	comboItems: ComboItemInput[] = [],
) {
	const { data } = await apiClient.post<{
		payments: Payment[];
		tickets: TicketWithCode[];
	}>("/api/payments", { reservationIds, simulateOutcome, comboItems });
	return data;
}
