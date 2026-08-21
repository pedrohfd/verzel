import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getEvent } from "@/api/requests/events/get-event";
import { getEventSeats } from "@/api/requests/events/get-event-seats";
import { createReservation } from "@/api/requests/reservations/create-reservation";
import type { Seat, VerzelEvent } from "@/api/types";
import SeatMap from "@/components/organisms/seat-map";
import Loader from "@/components/ui/loader";
import { authClient } from "@/lib/auth-client";
import { formatPriceCents } from "@/lib/format-price";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/events/$eventId")({
	component: EventDetailComponent,
});

function EventDetailComponent() {
	const { eventId } = Route.useParams();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const [event, setEvent] = useState<VerzelEvent | null>(null);
	const [seats, setSeats] = useState<Seat[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
	const [isReserving, setIsReserving] = useState(false);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [eventResponse, eventError] = await tryCatch(
				getEvent(eventId, controller.signal),
			);
			if (eventError) {
				setError("Não foi possível carregar o evento.");
				return;
			}
			setEvent(eventResponse);

			const [seatsResponse, seatsError] = await tryCatch(
				getEventSeats(eventId, controller.signal),
			);
			if (seatsError) {
				setError("Não foi possível carregar o mapa de assentos.");
				return;
			}
			setSeats(seatsResponse);
		})();

		return () => controller.abort();
	}, [eventId]);

	async function handleReserve() {
		if (!selectedSeat) return;

		if (!session) {
			navigate({ to: "/login" });
			return;
		}

		setIsReserving(true);
		const [reservation, reservationError] = await tryCatch(
			createReservation(eventId, selectedSeat.id),
		);
		setIsReserving(false);

		if (reservationError) {
			toast.error("Não foi possível reservar este assento. Tente outro.");
			return;
		}

		navigate({
			to: "/checkout/$reservationId",
			params: { reservationId: reservation.id },
		});
	}

	if (error) {
		return (
			<div className="container mx-auto max-w-3xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!event || !seats) return <Loader />;

	const sessionDate = new Date(event.sessionAt);

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<div className="mb-6 flex gap-4">
				{event.moviePosterPath && (
					<img
						src={tmdbImageUrl(event.moviePosterPath, "w342")}
						alt={event.movieTitle}
						className="h-48 w-32 object-cover"
					/>
				)}
				<div className="flex flex-col gap-1">
					<h1 className="font-bold text-2xl">{event.movieTitle}</h1>
					<p className="text-muted-foreground text-sm">
						{sessionDate.toLocaleDateString("pt-BR", {
							day: "2-digit",
							month: "2-digit",
							year: "numeric",
						})}{" "}
						às{" "}
						{sessionDate.toLocaleTimeString("pt-BR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					<p className="text-muted-foreground text-sm">{event.venueName}</p>
					<p className="text-muted-foreground text-sm">{event.venueAddress}</p>
					<p className="font-medium text-sm">
						{formatPriceCents(event.priceCents)}
					</p>
				</div>
			</div>

			{seats.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Este evento ainda não tem mapa de assentos disponível.
				</p>
			) : (
				<>
					<h2 className="mb-3 font-semibold text-lg">Escolha seu assento</h2>
					<SeatMap
						seats={seats}
						columns={event.columns}
						selectedSeatId={selectedSeat?.id ?? null}
						onSelect={(seat) => {
							if (seat.status === "taken") return;
							setSelectedSeat(seat);
						}}
					/>

					<div className="mt-6 flex items-center gap-4">
						<Button
							disabled={!selectedSeat || isReserving}
							onClick={handleReserve}
						>
							{isReserving
								? "Reservando..."
								: selectedSeat
									? `Reservar assento ${selectedSeat.label}`
									: "Selecione um assento"}
						</Button>
					</div>
				</>
			)}
		</div>
	);
}
