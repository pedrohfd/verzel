import type { TicketStatus } from "@/api/types";

const badges: Record<
	TicketStatus,
	{
		variant: "default" | "secondary" | "destructive" | "outline";
		label: string;
	}
> = {
	valid: { variant: "default", label: "Válido" },
	used: { variant: "secondary", label: "Utilizado" },
	cancelled: { variant: "destructive", label: "Cancelado" },
	expired: { variant: "outline", label: "Expirado" },
};

export function ticketStatusBadge(status: TicketStatus) {
	return badges[status];
}

export const ticketStatusOptions = (Object.keys(badges) as TicketStatus[]).map(
	(value) => ({ value, label: badges[value].label }),
);
