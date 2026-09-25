import { apiClient } from "@/api/client";
import type { Purchase, TicketWithCode } from "@/api/types";

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
		purchase: Purchase | null;
		tickets: TicketWithCode[];
	}>("/api/payments", { reservationIds, simulateOutcome, comboItems });
	return data;
}
