import { apiClient } from "@/api/client";
import type { Refund } from "@/api/types";

export async function cancelTicket(ticketId: string) {
	const { data } = await apiClient.post<Refund>(
		`/api/tickets/${ticketId}/cancel`,
	);
	return data;
}
