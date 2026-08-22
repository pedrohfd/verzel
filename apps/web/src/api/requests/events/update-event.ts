import { apiClient } from "@/api/client";
import type { VerzelEvent } from "@/api/types";
import type { CreateEventInput } from "./create-event";

export async function updateEvent(eventId: string, data: CreateEventInput) {
	const { data: event } = await apiClient.patch<VerzelEvent>(
		`/api/events/${eventId}`,
		{ action: "update", data },
	);
	return event;
}
