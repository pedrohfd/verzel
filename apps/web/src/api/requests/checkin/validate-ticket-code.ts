import { apiClient } from "@/api/client";
import type { CheckinResult } from "@/api/types";

export async function validateTicketCode(eventId: string, code: string) {
	const { data } = await apiClient.post<CheckinResult>(
		`/api/checkin/${eventId}/validate`,
		{ code },
	);
	return data;
}
