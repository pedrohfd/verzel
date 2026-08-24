import { apiClient } from "@/api/client";

export async function cancelTicket(ticketId: string) {
	await apiClient.post(`/api/tickets/${ticketId}/cancel`);
}
