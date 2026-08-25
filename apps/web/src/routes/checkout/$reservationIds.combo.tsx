import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getEventCombos } from "@/api/requests/combos/get-event-combos";
import { getEvent } from "@/api/requests/events/get-event";
import { cancelReservations } from "@/api/requests/reservations/cancel-reservations";
import { getReservation } from "@/api/requests/reservations/get-reservation";
import type { Combo, Reservation, VerzelEvent } from "@/api/types";
import CheckoutStepper from "@/components/molecules/checkout-stepper";
import QuantityStepper from "@/components/molecules/quantity-stepper";
import Loader from "@/components/ui/loader";
import { serializeComboSelection } from "@/lib/combo-selection";
import { formatPriceCents } from "@/lib/format-price";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/checkout/$reservationIds/combo")({
	component: ComboComponent,
});

function ComboComponent() {
	const { reservationIds } = Route.useParams();
	const navigate = useNavigate();
	const ids = reservationIds.split(",");

	const [reservations, setReservations] = useState<Reservation[] | null>(null);
	const [event, setEvent] = useState<VerzelEvent | null>(null);
	const [combos, setCombos] = useState<Combo[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [quantities, setQuantities] = useState<Record<string, number>>({});
	const resolvedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when reservationIds changes
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

			const [combosResponse, combosError] = await tryCatch(
				getEventCombos(reservationsResponse[0].eventId, controller.signal),
			);
			if (combosError) {
				setError("Não foi possível carregar os combos.");
				return;
			}
			setCombos(combosResponse);
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

	function handleContinue() {
		resolvedRef.current = true;
		const combosParam = serializeComboSelection(
			Object.entries(quantities).map(([comboId, quantity]) => ({
				comboId,
				quantity,
			})),
		);
		navigate({
			to: "/checkout/$reservationIds/payment",
			params: { reservationIds },
			search: combosParam ? { combos: combosParam } : {},
		});
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-md px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!reservations || !event || !combos) return <Loader />;

	const combosTotalCents = combos.reduce(
		(sum, combo) => sum + (quantities[combo.id] ?? 0) * combo.priceCents,
		0,
	);
	const ticketsTotalCents = event.priceCents * reservations.length;
	const totalCents = ticketsTotalCents + combosTotalCents;

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<CheckoutStepper current={2} />

			<div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
				<div>
					<h1 className="mb-2 font-bold text-2xl">Monte seu combo</h1>
					<p className="mb-6 text-muted-foreground text-sm">
						Retire no balcão com o código do seu ingresso.
					</p>

					{combos.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nenhum combo disponível para esta sessão.
						</p>
					) : (
						<div className="flex flex-col divide-y rounded-md border">
							{combos.map((combo) => (
								<div
									key={combo.id}
									className="flex items-center justify-between gap-4 p-4"
								>
									<div>
										<p className="font-semibold text-sm">{combo.name}</p>
										{combo.description && (
											<p className="text-muted-foreground text-xs">
												{combo.description}
											</p>
										)}
									</div>
									<span className="text-sm">
										{formatPriceCents(combo.priceCents)}
									</span>
									<QuantityStepper
										label={combo.name}
										value={quantities[combo.id] ?? 0}
										onChange={(value) =>
											setQuantities((current) => ({
												...current,
												[combo.id]: value,
											}))
										}
									/>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="flex flex-col gap-3 rounded-md border bg-card p-4">
					<h2 className="text-muted-foreground text-xs tracking-widest">
						RESUMO DO PEDIDO
					</h2>
					<p className="font-semibold text-lg">{event.movieTitle}</p>
					<p className="text-muted-foreground text-sm">
						{reservations.length} assento(s) ·{" "}
						{formatPriceCents(ticketsTotalCents)}
					</p>

					<div className="flex items-center justify-between border-t pt-3">
						<span className="text-muted-foreground text-sm">Total</span>
						<span className="font-semibold text-lg">
							{formatPriceCents(totalCents)}
						</span>
					</div>

					<Button
						className="w-full"
						data-icon="inline-end"
						onClick={handleContinue}
					>
						Ir para pagamento
						<ArrowRight />
					</Button>
					<Button variant="ghost" onClick={handleBack}>
						Voltar
					</Button>
				</div>
			</div>
		</div>
	);
}
