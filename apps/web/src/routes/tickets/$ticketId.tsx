import { createFileRoute } from "@tanstack/react-router";
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
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { cancelTicket } from "@/api/requests/tickets/cancel-ticket";
import { getTicket } from "@/api/requests/tickets/get-ticket";
import type { TicketDetail } from "@/api/types";
import BackLink from "@/components/molecules/back-link";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { requireRole } from "@/lib/route-guards";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

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

export const Route = createFileRoute("/tickets/$ticketId")({
	component: TicketDetailComponent,
	beforeLoad: () => requireRole("cliente"),
});

function TicketDetailComponent() {
	const { ticketId } = Route.useParams();
	const [ticket, setTicket] = useState<TicketDetail | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getTicket(ticketId, controller.signal),
			);
			if (fetchError) {
				setError("Ingresso não encontrado.");
				return;
			}
			setTicket(response);
		})();

		return () => controller.abort();
	}, [ticketId]);

	if (error) {
		return (
			<div className="container mx-auto max-w-md px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!ticket) return <Loader />;

	const sessionDate = new Date(ticket.event.sessionAt);
	const shareUrl = `${window.location.origin}/share/${ticket.shareToken}`;
	const statusBadge = ticketStatusBadge(ticket);
	const canCancel =
		!ticket.cancelledAt && !ticket.checkedInAt && sessionDate > new Date();

	const handleCopyShareLink = async () => {
		const [, copyError] = await tryCatch(
			navigator.clipboard.writeText(shareUrl),
		);
		if (copyError) {
			toast.error("Não foi possível copiar o link.");
			return;
		}
		toast.success("Link copiado.");
	};

	const handleCancelTicket = async () => {
		const [, cancelError] = await tryCatch(cancelTicket(ticket.id));
		if (cancelError) {
			toast.error("Não foi possível cancelar o ingresso.");
			return;
		}
		setTicket({ ...ticket, cancelledAt: new Date().toISOString() });
		toast.success("Ingresso cancelado.");
	};

	return (
		<div className="container mx-auto max-w-md px-4 py-6">
			<BackLink to="/tickets" label="Meus ingressos" />
			<div className="mb-6 flex items-start gap-4">
				{ticket.event.moviePosterPath && (
					<img
						src={tmdbImageUrl(ticket.event.moviePosterPath, "w342")}
						alt={ticket.event.movieTitle}
						className="h-32 w-24 object-cover"
					/>
				)}
				<div className="flex flex-col gap-1">
					<h1 className="font-bold text-xl">{ticket.event.movieTitle}</h1>
					<p className="text-muted-foreground text-sm">
						{sessionDate.toLocaleDateString("pt-BR")} às{" "}
						{sessionDate.toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					<p className="text-muted-foreground text-sm">
						{ticket.event.venueName}
					</p>
					<p className="font-medium text-sm">Assento {ticket.seat.label}</p>
					<p className="text-muted-foreground text-sm">
						{formatPriceCents(ticket.event.priceCents)}
					</p>
					<Badge variant={statusBadge.variant} className="w-fit">
						{statusBadge.label}
					</Badge>
				</div>
			</div>

			{canCancel && (
				<AlertDialog>
					<AlertDialogTrigger
						render={<Button variant="destructive" className="mb-6" />}
					>
						Cancelar ingresso
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Cancelar ingresso</AlertDialogTitle>
							<AlertDialogDescription>
								Tem certeza que deseja cancelar este ingresso? O assento voltará
								a ficar disponível e essa ação não pode ser desfeita.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Voltar</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={handleCancelTicket}
							>
								Cancelar ingresso
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}

			<div className="flex flex-col items-center gap-4 border border-border p-6">
				<QRCodeSVG value={ticket.code} size={320} marginSize={4} />
				<p className="break-all text-center text-muted-foreground text-xs">
					{ticket.code}
				</p>
			</div>

			<div className="mt-6 flex flex-col gap-2">
				<p className="font-medium text-sm">Link de compartilhamento</p>
				<div className="flex items-center gap-2">
					<p className="break-all text-muted-foreground text-xs">{shareUrl}</p>
					<Button
						variant="outline"
						size="icon-sm"
						className="shrink-0"
						onClick={handleCopyShareLink}
						aria-label="Copiar link de compartilhamento"
					>
						<Copy />
					</Button>
				</div>
			</div>
		</div>
	);
}
