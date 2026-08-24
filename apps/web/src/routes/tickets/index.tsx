import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@verzel/ui/components/alert-dialog";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Card, CardContent } from "@verzel/ui/components/card";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cancelTicket } from "@/api/requests/tickets/cancel-ticket";
import { getMyTickets } from "@/api/requests/tickets/get-my-tickets";
import type { MyTicket } from "@/api/types";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/tickets/")({
	component: MyTicketsComponent,
	beforeLoad: () => requireRole("cliente"),
});

function ticketStatusBadge(ticket: {
	checkedInAt: string | null;
	cancelledAt: string | null;
}) {
	if (ticket.cancelledAt) {
		return { variant: "destructive" as const, label: "Cancelado" };
	}
	if (ticket.checkedInAt) {
		return { variant: "secondary" as const, label: "Utilizado" };
	}
	return { variant: "default" as const, label: "Válido" };
}

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

	const handleCancelTicket = async (ticketId: string) => {
		const [, cancelError] = await tryCatch(cancelTicket(ticketId));
		if (cancelError) {
			toast.error("Não foi possível cancelar o ingresso.");
			return;
		}
		setTickets(
			(current) =>
				current?.map((entry) =>
					entry.ticket?.id === ticketId
						? {
								...entry,
								ticket: {
									...entry.ticket,
									cancelledAt: new Date().toISOString(),
								},
							}
						: entry,
				) ?? null,
		);
		toast.success("Ingresso cancelado.");
	};

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
					const statusBadge = ticketStatusBadge({
						checkedInAt: entry.ticket?.checkedInAt ?? null,
						cancelledAt: entry.ticket?.cancelledAt ?? null,
					});
					const canCancel =
						!entry.ticket?.cancelledAt &&
						!entry.ticket?.checkedInAt &&
						sessionDate > new Date();

					return (
						<Card
							key={entry.ticket?.id}
							className="flex-row items-center justify-between gap-4 p-4"
						>
							<Link
								to="/tickets/$ticketId"
								params={{ ticketId: entry.ticket?.id ?? "" }}
								className="flex flex-1 flex-col gap-1"
							>
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
							</Link>
							<div className="flex flex-row items-center gap-2">
								<Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
								{canCancel && (
									<AlertDialog>
										<AlertDialogTrigger
											render={<Button variant="destructive" size="sm" />}
										>
											Cancelar
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Cancelar ingresso</AlertDialogTitle>
												<AlertDialogDescription>
													Tem certeza que deseja cancelar este ingresso? O
													assento voltará a ficar disponível e essa ação não
													pode ser desfeita.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Voltar</AlertDialogCancel>
												<AlertDialogAction
													variant="destructive"
													onClick={() =>
														handleCancelTicket(entry.ticket?.id ?? "")
													}
												>
													Cancelar ingresso
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
							</div>
						</Card>
					);
				})}
			</div>
		</div>
	);
}
