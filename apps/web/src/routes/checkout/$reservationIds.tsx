import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getEvent } from "@/api/requests/events/get-event";
import { processPayment } from "@/api/requests/payments/process-payment";
import { cancelReservations } from "@/api/requests/reservations/cancel-reservations";
import { getReservation } from "@/api/requests/reservations/get-reservation";
import type { Reservation, VerzelEvent } from "@/api/types";
import Loader from "@/components/ui/loader";
import { formatPriceCents } from "@/lib/format-price";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/checkout/$reservationIds")({
	component: CheckoutComponent,
});

function CheckoutComponent() {
	const { reservationIds } = Route.useParams();
	const navigate = useNavigate();
	const ids = reservationIds.split(",");

	const [reservations, setReservations] = useState<Reservation[] | null>(null);
	const [event, setEvent] = useState<VerzelEvent | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
	const resolvedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when reservationIds changes; ids is derived from it and resolvedRef is a ref
	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [reservationsResponse, reservationsError] = await tryCatch(
				Promise.all(ids.map((id) => getReservation(id, controller.signal))),
			);
			if (reservationsError) {
				setError("Reserva não encontrada ou expirada.");
				return;
			}
			setReservations(reservationsResponse);

			const [eventResponse, eventError] = await tryCatch(
				getEvent(reservationsResponse[0].eventId, controller.signal),
			);
			if (eventError) {
				setError("Não foi possível carregar a sessão.");
				return;
			}
			setEvent(eventResponse);
		})();

		return () => {
			controller.abort();
			if (!resolvedRef.current) cancelReservations(ids);
		};
	}, [reservationIds]);

	function handleBack() {
		resolvedRef.current = true;
		navigate({
			to: "/events/$eventId",
			params: { eventId: reservations?.[0]?.eventId ?? "" },
			search: { reservationIds: ids.join(",") },
		});
	}

	async function handlePay(simulateOutcome: "approve" | "decline") {
		setIsProcessing(true);
		const [result, payError] = await tryCatch(
			processPayment(ids, simulateOutcome),
		);
		setIsProcessing(false);

		if (payError) {
			toast.error("Não foi possível processar o pagamento.");
			return;
		}

		resolvedRef.current = true;

		if (simulateOutcome === "decline") {
			toast.error("Pagamento recusado. Os assentos foram liberados.");
			navigate({
				to: "/events/$eventId",
				params: { eventId: reservations?.[0]?.eventId ?? "" },
			});
			return;
		}

		toast.success(
			result.tickets.length > 1
				? "Pagamento aprovado! Seus ingressos foram gerados."
				: "Pagamento aprovado! Seu ingresso foi gerado.",
		);
		navigate({ to: "/tickets" });
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

	if (!reservations || !event) return <Loader />;

	return (
		<div className="container mx-auto max-w-md px-4 py-6">
			<Button
				variant="ghost"
				className="mb-4 -ml-3"
				disabled={isProcessing}
				onClick={handleBack}
			>
				Voltar
			</Button>
			<h1 className="mb-2 font-bold text-2xl">Pagamento</h1>
			<p className="mb-6 text-muted-foreground text-sm">
				{event.movieTitle} —{" "}
				{formatPriceCents(event.priceCents * reservations.length)}
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
