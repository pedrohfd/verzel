import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";

export async function updateEventStatus(
	eventId: string,
	action: "publish" | "cancel",
) {
	const { data } = await apiClient.patch<VerzelEvent>(
		`/api/events/${eventId}`,
		{ action },
	);
	return data;
}
