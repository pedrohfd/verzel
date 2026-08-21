import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getSharedTicket } from "@/api/requests/tickets/get-shared-ticket";
import type { SharedTicket } from "@/api/types";
import Loader from "@/components/ui/loader";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/share/$shareToken")({
	component: SharedTicketComponent,
});

function SharedTicketComponent() {
	const { shareToken } = Route.useParams();
	const [ticket, setTicket] = useState<SharedTicket | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getSharedTicket(shareToken, controller.signal),
			);
			if (fetchError) {
				setError("Ingresso não encontrado.");
				return;
			}
			setTicket(response);
		})();

		return () => controller.abort();
	}, [shareToken]);

	if (error) {
		return (
			<div className="container mx-auto max-w-md px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!ticket) return <Loader />;

	const sessionDate = new Date(ticket.sessionAt);

	return (
		<div className="container mx-auto max-w-md px-4 py-6">
			<div className="flex items-start gap-4">
				{ticket.moviePosterPath && (
					<img
						src={tmdbImageUrl(ticket.moviePosterPath, "w342")}
						alt={ticket.movieTitle}
						className="h-32 w-24 object-cover"
					/>
				)}
				<div className="flex flex-col gap-1">
					<h1 className="font-bold text-xl">{ticket.movieTitle}</h1>
					<p className="text-muted-foreground text-sm">
						{sessionDate.toLocaleDateString("pt-BR")} às{" "}
						{sessionDate.toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					<p className="text-muted-foreground text-sm">{ticket.venueName}</p>
					<p className="text-muted-foreground text-sm">{ticket.venueAddress}</p>
					<p className="font-medium text-sm">Assento {ticket.seatLabel}</p>
				</div>
			</div>

			<p className="mt-6 text-muted-foreground text-xs">
				Este é um link de compartilhamento — o código de entrada (QR) só fica
				disponível para o dono do ingresso em "Meus Ingressos".
			</p>
		</div>
	);
}
