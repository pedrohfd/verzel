import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getEvent } from "@/api/requests/events/get-event";
import { getEventSeats } from "@/api/requests/events/get-event-seats";
import { cancelReservations } from "@/api/requests/reservations/cancel-reservations";
import { createReservation } from "@/api/requests/reservations/create-reservation";
import { getReservation } from "@/api/requests/reservations/get-reservation";
import type { Seat, VerzelEvent } from "@/api/types";
import DateSelect from "@/components/molecules/date-select";
import SeatSelectionSummary from "@/components/molecules/seat-selection-summary";
import EventInfo from "@/components/organisms/event-info";
import SeatMap from "@/components/organisms/seat-map";
import SessionPicker from "@/components/organisms/session-picker";
import Loader from "@/components/ui/loader";
import { useEventSessions } from "@/hooks/use-event-sessions";
import { useSeatMapPolling } from "@/hooks/use-seat-map-polling";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

interface EventDetailSearch {
	reservationIds?: string;
}

export const Route = createFileRoute("/events/$eventId")({
	component: EventDetailComponent,
	validateSearch: (search: Record<string, unknown>): EventDetailSearch => ({
		reservationIds:
			typeof search.reservationIds === "string"
				? search.reservationIds
				: undefined,
	}),
});

function EventDetailComponent() {
	const { eventId } = Route.useParams();
	const { reservationIds } = Route.useSearch();
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;
	const isOrganizer = role === "organizador";

	const [event, setEvent] = useState<VerzelEvent | null>(null);
	const [seats, setSeats] = useState<Seat[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
	const [isReserving, setIsReserving] = useState(false);
	const eventSessions = useEventSessions(event);
	const heldReservationsRef = useRef<Map<string, string>>(new Map());
	const proceedingToCheckoutRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-run when eventId/reservationIds change
	useEffect(() => {
		const controller = new AbortController();

		if (!reservationIds) {
			setSelectedSeats([]);
			heldReservationsRef.current = new Map();
		}

		(async () => {
			const [eventResponse, eventError] = await tryCatch(
				getEvent(eventId, controller.signal),
			);
			if (eventError) {
				setError("Não foi possível carregar a sessão.");
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

			if (reservationIds) {
				const ids = reservationIds.split(",");
				const results = await Promise.all(
					ids.map((id) => tryCatch(getReservation(id, controller.signal))),
				);

				const map = new Map<string, string>();
				const rehydrated: Seat[] = [];
				for (const [reservation, reservationError] of results) {
					if (
						reservationError ||
						!reservation ||
						reservation.status !== "holding"
					)
						continue;
					const key = `${reservation.seat.row}:${reservation.seat.column}`;
					map.set(key, reservation.id);
					rehydrated.push({
						eventId,
						row: reservation.seat.row,
						column: reservation.seat.column,
						label: reservation.seat.label,
						status: "taken",
					});
				}
				heldReservationsRef.current = map;
				setSelectedSeats(rehydrated);
			}
		})();

		return () => {
			controller.abort();
			if (
				!proceedingToCheckoutRef.current &&
				heldReservationsRef.current.size > 0
			) {
				cancelReservations(Array.from(heldReservationsRef.current.values()));
			}
		};
	}, [eventId, reservationIds]);

	const polledSeats = useSeatMapPolling(
		eventId,
		Boolean(event && seats && seats.length > 0 && !isReserving),
	);

	useEffect(() => {
		if (!polledSeats) return;

		setSeats(polledSeats);
		setSelectedSeats((current) => {
			const stillAvailable = current.filter((seat) => {
				const key = `${seat.row}:${seat.column}`;
				if (heldReservationsRef.current.has(key)) return true;
				const fresh = polledSeats.find(
					(s) => s.row === seat.row && s.column === seat.column,
				);
				return fresh?.status !== "taken";
			});

			if (stillAvailable.length !== current.length) {
				toast.warning(
					"Um ou mais assentos selecionados foram reservados por outra pessoa e foram removidos da sua seleção.",
				);
			}

			return stillAvailable;
		});
	}, [polledSeats]);

	async function handleReserve() {
		if (selectedSeats.length === 0) return;

		if (!session) {
			navigate({ to: "/login" });
			return;
		}

		const heldMap = heldReservationsRef.current;
		const selectedKeys = new Set(
			selectedSeats.map((seat) => `${seat.row}:${seat.column}`),
		);

		const keptIds: string[] = [];
		const toCancelIds: string[] = [];
		const toCreateSeats: Seat[] = [];

		for (const [key, id] of heldMap) {
			if (selectedKeys.has(key)) {
				keptIds.push(id);
			} else {
				toCancelIds.push(id);
			}
		}
		for (const seat of selectedSeats) {
			const key = `${seat.row}:${seat.column}`;
			if (!heldMap.has(key)) toCreateSeats.push(seat);
		}

		if (toCancelIds.length === 0 && toCreateSeats.length === 0) {
			proceedingToCheckoutRef.current = true;
			navigate({
				to: "/checkout/$reservationIds",
				params: { reservationIds: keptIds.join(",") },
			});
			return;
		}

		setIsReserving(true);

		if (toCancelIds.length > 0) {
			await tryCatch(cancelReservations(toCancelIds));
		}

		let newIds: string[] = [];
		if (toCreateSeats.length > 0) {
			const [reservations, reservationError] = await tryCatch(
				createReservation(
					eventId,
					toCreateSeats.map((seat) => ({
						row: seat.row,
						column: seat.column,
					})),
				),
			);
			setIsReserving(false);

			if (reservationError) {
				toast.error("Não foi possível reservar os assentos. Tente outros.");
				return;
			}
			newIds = reservations.map((r) => r.id);
		} else {
			setIsReserving(false);
		}

		proceedingToCheckoutRef.current = true;
		navigate({
			to: "/checkout/$reservationIds",
			params: {
				reservationIds: [...keptIds, ...newIds].join(","),
			},
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

	return (
		<div className="container mx-auto max-w-[1800px] px-4 py-6">
			{seats.length === 0 ? (
				<>
					<DateSelect
						dates={eventSessions.dates}
						selectedDateKey={eventSessions.selectedDateKey}
						onSelectDate={eventSessions.onSelectDate}
					/>
					<EventInfo event={event} />
					<div className="mt-4 max-w-xs">
						<SessionPicker
							cinemas={eventSessions.cinemas}
							venueName={eventSessions.venueName}
							onSelectCinema={eventSessions.onSelectCinema}
							times={eventSessions.times}
							selectedTimeId={eventSessions.selectedTimeId}
							onSelectTime={eventSessions.onSelectTime}
						/>
					</div>
					<p className="mt-6 text-muted-foreground text-sm">
						Esta sessão ainda não tem mapa de assentos disponível.
					</p>
				</>
			) : (
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr] lg:items-start">
					<div className="flex flex-col gap-6">
						<DateSelect
							dates={eventSessions.dates}
							selectedDateKey={eventSessions.selectedDateKey}
							onSelectDate={eventSessions.onSelectDate}
						/>
						<EventInfo event={event} />
						<SessionPicker
							cinemas={eventSessions.cinemas}
							venueName={eventSessions.venueName}
							onSelectCinema={eventSessions.onSelectCinema}
							times={eventSessions.times}
							selectedTimeId={eventSessions.selectedTimeId}
							onSelectTime={eventSessions.onSelectTime}
						/>
						{!isOrganizer && (
							<SeatSelectionSummary
								selectedSeats={selectedSeats}
								priceCents={event.priceCents}
								isReserving={isReserving}
								onRemove={(seat) => {
									setSelectedSeats((current) =>
										current.filter(
											(s) => s.row !== seat.row || s.column !== seat.column,
										),
									);
								}}
								onReserve={handleReserve}
							/>
						)}
					</div>

					<div className="lg:sticky lg:top-6">
						<SeatMap
							seats={seats}
							selectedSeats={selectedSeats}
							readOnly={isOrganizer}
							onSelect={(seat) => {
								if (isOrganizer || seat.status === "taken") return;
								setSelectedSeats((current) =>
									current.some(
										(s) => s.row === seat.row && s.column === seat.column,
									)
										? current.filter(
												(s) => s.row !== seat.row || s.column !== seat.column,
											)
										: [...current, seat],
								);
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
