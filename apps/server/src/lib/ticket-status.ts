export type TicketStatus = "valid" | "used" | "cancelled" | "expired";

export function sessionEndsAt(event: {
	sessionAt: Date;
	durationMinutes: number;
}) {
	return new Date(event.sessionAt.getTime() + event.durationMinutes * 60_000);
}

export function ticketStatus(
	ticket: { checkedInAt: Date | null; cancelledAt: Date | null },
	event: { sessionAt: Date; durationMinutes: number },
	now: Date = new Date(),
): TicketStatus {
	if (ticket.cancelledAt) return "cancelled";
	if (ticket.checkedInAt) return "used";
	if (now >= sessionEndsAt(event)) return "expired";
	return "valid";
}
