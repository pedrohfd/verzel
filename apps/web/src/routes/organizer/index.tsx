import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@verzel/ui/components/table";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getMyEvents } from "@/api/requests/events/get-my-events";
import { updateEventStatus } from "@/api/requests/events/update-event-status";
import type { VerzelEvent } from "@/api/types";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/")({
	component: OrganizerDashboardComponent,
	beforeLoad: () => requireRole("organizador"),
});

const statusLabel: Record<VerzelEvent["status"], string> = {
	draft: "Rascunho",
	published: "Publicado",
	cancelled: "Cancelado",
};

function OrganizerDashboardComponent() {
	const [events, setEvents] = useState<VerzelEvent[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);

	async function load(controller?: AbortController) {
		const [response, fetchError] = await tryCatch(
			getMyEvents(controller?.signal),
		);
		if (fetchError) {
			setError("Não foi possível carregar seus eventos.");
			return;
		}
		setEvents(response);
	}

	useEffect(() => {
		const controller = new AbortController();
		load(controller);
		return () => controller.abort();
	}, []);

	async function handleAction(eventId: string, action: "publish" | "cancel") {
		setPendingId(eventId);
		const [, actionError] = await tryCatch(updateEventStatus(eventId, action));
		setPendingId(null);

		if (actionError) {
			toast.error("Não foi possível atualizar o evento.");
			return;
		}

		toast.success(
			action === "publish" ? "Evento publicado." : "Evento cancelado.",
		);
		load();
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!events) return <Loader />;

	return (
		<div className="container mx-auto max-w-4xl px-4 py-6">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-bold text-2xl">Meus Eventos</h1>
				<Link to="/organizer/new">
					<Button>Criar evento</Button>
				</Link>
			</div>

			{events.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Você ainda não criou nenhum evento.
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Filme</TableHead>
							<TableHead>Sessão</TableHead>
							<TableHead>Local</TableHead>
							<TableHead>Preço</TableHead>
							<TableHead>Status</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{events.map((event) => (
							<TableRow key={event.id}>
								<TableCell>{event.movieTitle}</TableCell>
								<TableCell>
									{new Date(event.sessionAt).toLocaleString("pt-BR")}
								</TableCell>
								<TableCell>{event.venueName}</TableCell>
								<TableCell>{formatPriceCents(event.priceCents)}</TableCell>
								<TableCell>
									<Badge
										variant={
											event.status === "published"
												? "default"
												: event.status === "cancelled"
													? "destructive"
													: "secondary"
										}
									>
										{statusLabel[event.status]}
									</Badge>
								</TableCell>
								<TableCell className="text-right">
									{event.status === "draft" && (
										<Button
											size="sm"
											disabled={pendingId === event.id}
											onClick={() => handleAction(event.id, "publish")}
										>
											Publicar
										</Button>
									)}
									{event.status === "published" && (
										<Button
											size="sm"
											variant="outline"
											disabled={pendingId === event.id}
											onClick={() => handleAction(event.id, "cancel")}
										>
											Cancelar
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
