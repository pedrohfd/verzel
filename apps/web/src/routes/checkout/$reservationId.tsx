import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getEvent } from "@/api/requests/events/get-event";
import { processPayment } from "@/api/requests/payments/process-payment";
import { getReservation } from "@/api/requests/reservations/get-reservation";
import type { Reservation, VerzelEvent } from "@/api/types";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/checkout/$reservationId")({
	component: CheckoutComponent,
});

function CheckoutComponent() {
	const { reservationId } = Route.useParams();
	const navigate = useNavigate();

	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [event, setEvent] = useState<VerzelEvent | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [reservationResponse, reservationError] = await tryCatch(
				getReservation(reservationId, controller.signal),
			);
			if (reservationError) {
				setError("Reserva não encontrada ou expirada.");
				return;
			}
			setReservation(reservationResponse);

			const [eventResponse, eventError] = await tryCatch(
				getEvent(reservationResponse.eventId, controller.signal),
			);
			if (eventError) {
				setError("Não foi possível carregar o evento.");
				return;
			}
			setEvent(eventResponse);
		})();

		return () => controller.abort();
	}, [reservationId]);

	async function handlePay(simulateOutcome: "approve" | "decline") {
		setIsProcessing(true);
		const [result, payError] = await tryCatch(
			processPayment(reservationId, simulateOutcome),
		);
		setIsProcessing(false);

		if (payError) {
			toast.error("Não foi possível processar o pagamento.");
			return;
		}

		if (result.payment.status === "declined") {
			toast.error("Pagamento recusado. O assento foi liberado.");
			navigate({
				to: "/events/$eventId",
				params: { eventId: reservation?.eventId ?? "" },
			});
			return;
		}

		toast.success("Pagamento aprovado! Seu ingresso foi gerado.");
		navigate({
			to: "/tickets/$ticketId",
			params: { ticketId: result.ticket?.id ?? "" },
		});
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-md px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
				<Link to="/">
					<Button variant="outline" className="mt-4">
						Voltar
					</Button>
				</Link>
			</div>
		);
	}

	if (!reservation || !event) return <Loader />;

	return (
		<div className="container mx-auto max-w-md px-4 py-6">
			<h1 className="mb-2 font-bold text-2xl">Pagamento</h1>
			<p className="mb-6 text-muted-foreground text-sm">
				{event.movieTitle} — {formatPriceCents(event.priceCents)}
			</p>

			<div className="mb-6 flex flex-col gap-2">
				<Label htmlFor="card-number">Número do cartão (simulado)</Label>
				<Input
					id="card-number"
					value={cardNumber}
					onChange={(e) => setCardNumber(e.target.value)}
				/>
				<p className="text-muted-foreground text-xs">
					Este é um pagamento simulado — nenhuma transação real é realizada.
				</p>
			</div>

			<div className="flex gap-3">
				<Button
					className="flex-1"
					disabled={isProcessing}
					onClick={() => handlePay("approve")}
				>
					{isProcessing ? "Processando..." : "Simular aprovação"}
				</Button>
				<Button
					className="flex-1"
					variant="outline"
					disabled={isProcessing}
					onClick={() => handlePay("decline")}
				>
					Simular recusa
				</Button>
			</div>
		</div>
	);
}
