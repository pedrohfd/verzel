import { apiClient } from "@/api/client";
import type { TicketDetail } from "@/api/types";

export async function getTicket(ticketId: string, signal?: AbortSignal) {
	const { data } = await apiClient.get<TicketDetail>(
		`/api/tickets/${ticketId}`,
		{
			signal,
		},
	);
	return data;
}
