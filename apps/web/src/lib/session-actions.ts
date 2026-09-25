import type { VerzelEvent } from "@/api/types";

export function canCancelSession(
	event: Pick<VerzelEvent, "status" | "sessionAt">,
	now: Date = new Date(),
) {
	return event.status !== "cancelled" && new Date(event.sessionAt) > now;
}
