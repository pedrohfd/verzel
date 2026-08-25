import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@verzel/ui/components/select";
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
import type { EventStatus, VerzelEvent } from "@/api/types";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

interface OrganizerSearch {
	status?: EventStatus | "all";
	q?: string;
}

export const Route = createFileRoute("/organizer/")({
	component: OrganizerDashboardComponent,
	beforeLoad: () => requireRole("organizador"),
	validateSearch: (search: Record<string, unknown>): OrganizerSearch => ({
		status:
			search.status === "draft" ||
			search.status === "published" ||
			search.status === "cancelled"
				? search.status
				: "all",
		q: typeof search.q === "string" ? search.q : "",
	}),
});

const statusLabel: Record<VerzelEvent["status"], string> = {
	draft: "Rascunho",
	published: "Publicado",
	cancelled: "Cancelado",
};

function OrganizerDashboardComponent() {
	const { status = "all", q = "" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const [events, setEvents] = useState<VerzelEvent[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pendingId, setPendingId] = useState<string | null>(null);

	async function load(controller?: AbortController) {
		const [response, fetchError] = await tryCatch(
			getMyEvents(
				{ status: status === "all" ? undefined : status, q: q || undefined },
				controller?.signal,
			),
		);
		if (fetchError) {
			setError("Não foi possível carregar suas sessões.");
			return;
		}
		setEvents(response);
	}

	useEffect(() => {
		const controller = new AbortController();
		load(controller);
		return () => controller.abort();
	}, [status, q]);

	async function handleAction(eventId: string, action: "publish" | "cancel") {
		setPendingId(eventId);
		const [, actionError] = await tryCatch(updateEventStatus(eventId, action));
		setPendingId(null);

		if (actionError) {
			toast.error("Não foi possível atualizar a sessão.");
			return;
		}

		toast.success(
			action === "publish" ? "Sessão publicada." : "Sessão cancelada.",
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
				<h1 className="font-bold text-2xl">Minhas Sessões</h1>
				<div className="flex gap-2">
					<Link to="/organizer/new">
						<Button>Criar sessão</Button>
					</Link>
				</div>
			</div>

			<div className="mb-4 flex flex-wrap items-center gap-2">
				<Select
					value={status}
					onValueChange={(value) => {
						if (!value) return;
						navigate({
							search: (prev) => ({
								...prev,
								status: value as EventStatus | "all",
							}),
						});
					}}
					items={[
						{ value: "all", label: "Todos os status" },
						{ value: "draft", label: statusLabel.draft },
						{ value: "published", label: statusLabel.published },
						{ value: "cancelled", label: statusLabel.cancelled },
					]}
				>
					<SelectTrigger className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos os status</SelectItem>
						<SelectItem value="draft">{statusLabel.draft}</SelectItem>
						<SelectItem value="published">{statusLabel.published}</SelectItem>
						<SelectItem value="cancelled">{statusLabel.cancelled}</SelectItem>
					</SelectContent>
				</Select>

				<Input
					placeholder="Buscar por filme"
					className="w-56"
					value={q}
					onChange={(e) =>
						navigate({
							search: (prev) => ({ ...prev, q: e.target.value }),
						})
					}
				/>
			</div>

			{events.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					{status !== "all" || q
						? "Nenhuma sessão encontrada para os filtros aplicados."
						: "Você ainda não criou nenhuma sessão."}
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
								<TableCell className="flex justify-end gap-2 text-right">
									{event.status === "draft" && (
										<>
											<Link
												to="/organizer/$eventId/edit"
												params={{ eventId: event.id }}
											>
												<Button size="sm" variant="outline">
													Editar
												</Button>
											</Link>
											<Button
												size="sm"
												className="min-w-18"
												disabled={pendingId === event.id}
												onClick={() => handleAction(event.id, "publish")}
											>
												Publicar
											</Button>
										</>
									)}
									{event.status === "published" && (
										<>
											<Link
												to="/organizer/$eventId/edit"
												params={{ eventId: event.id }}
											>
												<Button size="sm" variant="outline">
													Editar
												</Button>
											</Link>
											<Button
												size="sm"
												variant="outline"
												className="min-w-18"
												disabled={pendingId === event.id}
												onClick={() => handleAction(event.id, "cancel")}
											>
												Cancelar
											</Button>
										</>
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
