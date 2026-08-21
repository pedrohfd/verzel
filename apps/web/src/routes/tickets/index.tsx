import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@verzel/ui/components/badge";
import { Card, CardContent } from "@verzel/ui/components/card";
import { useEffect, useState } from "react";

import { getMyTickets } from "@/api/requests/tickets/get-my-tickets";
import type { MyTicket } from "@/api/types";
import Loader from "@/components/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/tickets/")({
	component: MyTicketsComponent,
	beforeLoad: () => requireRole("cliente"),
});

function MyTicketsComponent() {
	const [tickets, setTickets] = useState<MyTicket[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyTickets(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar seus ingressos.");
				return;
			}
			setTickets(response);
		})();

		return () => controller.abort();
	}, []);

	if (error) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!tickets) return <Loader />;

	const withTicket = tickets.filter((t) => t.ticket !== null);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Meus Ingressos</h1>

			{withTicket.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Você ainda não tem ingressos.
				</p>
			)}

			<div className="flex flex-col gap-3">
				{withTicket.map((entry) => {
					const sessionDate = new Date(entry.event.sessionAt);
					const isUsed = entry.ticket?.checkedInAt !== null;

					return (
						<Link
							key={entry.ticket?.id}
							to="/tickets/$ticketId"
							params={{ ticketId: entry.ticket?.id ?? "" }}
						>
							<Card className="flex-row items-center justify-between gap-4 p-4">
								<CardContent className="flex flex-1 flex-col gap-1 p-0">
									<h3 className="font-semibold text-sm">
										{entry.event.movieTitle}
									</h3>
									<p className="text-muted-foreground text-xs">
										{sessionDate.toLocaleDateString("pt-BR")} · Assento{" "}
										{entry.seat.label} · {entry.event.venueName}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatPriceCents(entry.event.priceCents)}
									</p>
								</CardContent>
								<Badge variant={isUsed ? "secondary" : "default"}>
									{isUsed ? "Utilizado" : "Válido"}
								</Badge>
							</Card>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
