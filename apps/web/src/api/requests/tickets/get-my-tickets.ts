import { apiClient } from "@/api/client";
import type { MyTicket } from "@/api/types";

export async function getMyTickets(signal?: AbortSignal) {
	const { data } = await apiClient.get<{ results: MyTicket[] }>(
		"/api/tickets/mine",
		{ signal },
	);
	return data.results;
}
