import { apiClient } from "@/api/client";
import type { SharedTicket } from "@/api/types";

export async function getSharedTicket(
	shareToken: string,
	signal?: AbortSignal,
) {
	const { data } = await apiClient.get<SharedTicket>(
		`/api/tickets/share/${shareToken}`,
		{ signal },
	);
	return data;
}
