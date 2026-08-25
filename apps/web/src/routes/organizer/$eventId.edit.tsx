import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@verzel/ui/components/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { getEvent } from "@/api/requests/events/get-event";
import { updateEvent } from "@/api/requests/events/update-event";
import { getMovieDetails } from "@/api/requests/movies/get-movie-details";
import { getMyRooms } from "@/api/requests/rooms/get-my-rooms";
import {
	getRoomSchedule,
	type RoomScheduleSlot,
} from "@/api/requests/rooms/get-room-schedule";
import type { CinemaRoom, TmdbMovie, VerzelEvent } from "@/api/types";
import BackLink from "@/components/molecules/back-link";
import SessionTimePicker from "@/components/molecules/session-time-picker";
import CinemaRoomPreview from "@/components/organisms/cinema-room-preview";
import MovieSearchField from "@/components/organisms/movie-search-field";
import Loader from "@/components/ui/loader";
import { authClient } from "@/lib/auth-client";
import { findSlotConflict } from "@/lib/find-slot-conflict";
import { formatAddress } from "@/lib/format-address";
import { maskCurrencyBRL } from "@/lib/masks";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

const DEFAULT_DURATION_MINUTES = 120;

interface EditEventSearch {
	roomId?: string;
}

interface EditEventDraft {
	selectedMovie: TmdbMovie;
	sessionAt: string;
	price: string;
}

export const Route = createFileRoute("/organizer/$eventId/edit")({
	component: EditEventComponent,
	beforeLoad: () => requireRole("organizador"),
	validateSearch: (search: Record<string, unknown>): EditEventSearch => ({
		roomId: typeof search.roomId === "string" ? search.roomId : undefined,
	}),
});

function draftStorageKey(eventId: string) {
	return `organizer:edit-event-draft:${eventId}`;
}

interface SessionCinemaFields {
	cinemaName?: string;
	street?: string;
	number?: string;
	complement?: string | null;
	neighborhood?: string;
	city?: string;
	state?: string;
}

function toDatetimeLocalValue(isoString: string): string {
	const date = new Date(isoString);
	const offset = date.getTimezoneOffset();
	const local = new Date(date.getTime() - offset * 60 * 1000);
	return local.toISOString().slice(0, 16);
}

function EditEventComponent() {
	const { eventId } = Route.useParams();

	const [event, setEvent] = useState<VerzelEvent | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [response, fetchError] = await tryCatch(
				getEvent(eventId, controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar a sessão.");
				return;
			}
			setEvent(response);
		})();
		return () => controller.abort();
	}, [eventId]);

	if (error) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!event) return <Loader />;

	if (event.status === "cancelled") {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-muted-foreground text-sm">
					Esta sessão não é mais um rascunho e não pode ser editada.
				</p>
				<Link to="/organizer" className="mt-4 inline-block">
					<Button variant="outline">Voltar</Button>
				</Link>
			</div>
		);
	}

	return <EditEventForm eventId={eventId} event={event} />;
}

function EditEventForm({
	eventId,
	event,
}: {
	eventId: string;
	event: VerzelEvent;
}) {
	const navigate = useNavigate();
	const { roomId: returnedRoomId } = Route.useSearch();
	const { data: session } = authClient.useSession();
	const cinema = session?.user as SessionCinemaFields | undefined;
	const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>({
		id: event.tmdbMovieId,
		title: event.movieTitle,
		poster_path: event.moviePosterPath,
		backdrop_path: event.movieBackdropPath,
		release_date: "",
		vote_average: 0,
	});

	const [rooms, setRooms] = useState<CinemaRoom[]>([]);
	const [selectedRoomId, setSelectedRoomId] = useState(event.roomId ?? "");
	const [occupiedSlots, setOccupiedSlots] = useState<RoomScheduleSlot[]>([]);
	const [occupiedSlotsLoading, setOccupiedSlotsLoading] = useState(false);
	const [movieDuration, setMovieDuration] = useState<number | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyRooms(controller.signal),
			);
			if (!fetchError) setRooms(response);
		})();
		return () => controller.abort();
	}, []);

	useEffect(() => {
		if (!selectedRoomId) {
			setOccupiedSlots([]);
			return;
		}

		const controller = new AbortController();
		setOccupiedSlotsLoading(true);
		(async () => {
			const [response, fetchError] = await tryCatch(
				getRoomSchedule(selectedRoomId, {
					excludeEventId: eventId,
					signal: controller.signal,
				}),
			);
			if (!fetchError) setOccupiedSlots(response);
			if (!controller.signal.aborted) setOccupiedSlotsLoading(false);
		})();
		return () => controller.abort();
	}, [selectedRoomId, eventId]);

	useEffect(() => {
		if (!selectedMovie) {
			setMovieDuration(null);
			return;
		}

		const controller = new AbortController();
		(async () => {
			const [response, fetchError] = await tryCatch(
				getMovieDetails(selectedMovie.id, controller.signal),
			);
			if (!fetchError)
				setMovieDuration(response.runtime ?? DEFAULT_DURATION_MINUTES);
		})();
		return () => controller.abort();
	}, [selectedMovie]);

	const form = useForm({
		defaultValues: {
			sessionAt: toDatetimeLocalValue(event.sessionAt),
			price: (event.priceCents / 100).toFixed(2).replace(".", ","),
			roomId: event.roomId ?? "",
		},
		onSubmit: async ({ value }) => {
			if (!selectedMovie) {
				toast.error("Selecione um filme para a sessão.");
				return;
			}

			const [, submitError] = await tryCatch(
				updateEvent(eventId, {
					tmdbMovieId: selectedMovie.id,
					movieTitle: selectedMovie.title,
					moviePosterPath: selectedMovie.poster_path,
					movieBackdropPath: selectedMovie.backdrop_path,
					sessionAt: new Date(value.sessionAt).toISOString(),
					priceCents: Math.round(Number(value.price.replace(",", ".")) * 100),
					roomId: value.roomId,
				}),
			);

			if (submitError) {
				toast.error("Não foi possível salvar as alterações.");
				return;
			}

			toast.success("Sessão atualizada.");
			navigate({ to: "/organizer" });
		},
		validators: {
			onSubmit: z.object({
				sessionAt: z
					.string()
					.min(1, "Informe a data e hora da sessão")
					.refine(
						(value) => new Date(value) > new Date(),
						"A sessão deve ser no futuro",
					),
				price: z
					.string()
					.refine(
						(value) => Number(value.replace(",", ".")) > 0,
						"Informe um preço válido",
					),
				roomId: z.string().min(1, "Selecione uma sala"),
			}),
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: only re-check sessionAt validity when the schedule/duration it depends on changes
	useEffect(() => {
		form.validateField("sessionAt", "change");
	}, [occupiedSlots, movieDuration]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: only run once for the returned roomId
	useEffect(() => {
		if (!returnedRoomId) return;

		const stored = sessionStorage.getItem(draftStorageKey(eventId));
		if (stored) {
			const draft: EditEventDraft = JSON.parse(stored);
			setSelectedMovie(draft.selectedMovie);
			form.setFieldValue("sessionAt", draft.sessionAt);
			form.setFieldValue("price", draft.price);
			sessionStorage.removeItem(draftStorageKey(eventId));
		}

		form.setFieldValue("roomId", returnedRoomId);
		setSelectedRoomId(returnedRoomId);
		navigate({
			to: "/organizer/$eventId/edit",
			params: { eventId },
			search: {},
			replace: true,
		});
	}, [returnedRoomId]);

	function handleCreateRoomClick() {
		if (!selectedMovie) return;

		const draft: EditEventDraft = {
			selectedMovie,
			sessionAt: form.getFieldValue("sessionAt"),
			price: form.getFieldValue("price"),
		};
		sessionStorage.setItem(draftStorageKey(eventId), JSON.stringify(draft));
		navigate({
			to: "/organizer/rooms/new",
			search: { returnTo: "edit-event", eventId },
		});
	}

	return (
		<div className="container mx-auto max-w-[1600px] px-4 py-6">
			<BackLink to="/organizer" label="Minhas sessões" />
			<h1 className="mb-6 font-bold text-2xl">Editar sessão</h1>

			<div className="flex flex-col gap-6 lg:flex-row lg:items-start">
				<div className="flex flex-1 flex-col gap-6">
					<div className="flex flex-col gap-2">
						<Label htmlFor="movie-search">Filme</Label>
						<MovieSearchField
							value={selectedMovie}
							onChange={setSelectedMovie}
						/>
					</div>

					{cinema?.cinemaName && (
						<div className="flex flex-col gap-2">
							<Label>Cinema</Label>
							<p className="text-sm">{cinema.cinemaName}</p>
							<span className="text-muted-foreground text-xs">
								{formatAddress({
									street: cinema.street ?? "",
									number: cinema.number ?? "",
									complement: cinema.complement,
									neighborhood: cinema.neighborhood ?? "",
									city: cinema.city ?? "",
									state: cinema.state ?? "",
								})}
							</span>
						</div>
					)}

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="flex flex-col gap-4"
					>
						<form.Field name="roomId">
							{(field) => (
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<Label htmlFor={field.name}>Sala</Label>
										{event.status !== "published" && (
											<Button
												type="button"
												variant="link"
												size="sm"
												className="h-auto p-0"
												onClick={handleCreateRoomClick}
											>
												Criar nova sala
											</Button>
										)}
									</div>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											field.handleChange(value ?? "");
											setSelectedRoomId(value ?? "");
										}}
										disabled={event.status === "published"}
										items={rooms.map((room) => ({
											value: room.id,
											label: `${room.name} (${room.rows}x${room.columns})`,
										}))}
									>
										<SelectTrigger id={field.name} className="w-full">
											<SelectValue placeholder="Selecione uma sala" />
										</SelectTrigger>
										<SelectContent>
											{rooms.map((room) => (
												<SelectItem key={room.id} value={room.id}>
													{room.name} ({room.rows}x{room.columns})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{field.state.meta.errors.map((err) => (
										<p key={err?.message} className="text-destructive text-xs">
											{err?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="price">
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Preço (R$)</Label>
									<Input
										id={field.name}
										placeholder="35,00"
										inputMode="numeric"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) =>
											field.handleChange(maskCurrencyBRL(e.target.value))
										}
									/>
									{field.state.meta.errors.map((err) => (
										<p key={err?.message} className="text-destructive text-xs">
											{err?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field
							name="sessionAt"
							validators={{
								onChange: ({ value }) =>
									findSlotConflict(
										value,
										movieDuration ?? DEFAULT_DURATION_MINUTES,
										occupiedSlots,
									)
										? "Este horário conflita com outra sessão nesta sala."
										: undefined,
							}}
						>
							{(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Data e hora da sessão</Label>
									<SessionTimePicker
										id={field.name}
										value={field.state.value}
										onChange={field.handleChange}
										onBlur={field.handleBlur}
										occupiedSlots={occupiedSlots}
										durationMinutes={movieDuration ?? DEFAULT_DURATION_MINUTES}
										loading={occupiedSlotsLoading}
									/>
									{field.state.meta.errors.map((err) => {
										const message =
											typeof err === "string" ? err : err?.message;
										return (
											<p key={message} className="text-destructive text-xs">
												{message}
											</p>
										);
									})}
								</div>
							)}
						</form.Field>
						{event.status === "published" && (
							<p className="text-muted-foreground text-xs">
								A sala não pode mais ser alterada após a publicação da sessão.
							</p>
						)}

						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button type="submit" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? "Salvando..." : "Salvar alterações"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</div>

				<div className="flex flex-col gap-2 lg:sticky lg:top-6 lg:w-240 lg:shrink-0">
					<Label>Pré-visualização da sala</Label>
					<form.Subscribe selector={(state) => state.values.roomId}>
						{(roomId) => {
							const room = rooms.find((r) => r.id === roomId);
							return (
								<CinemaRoomPreview
									rows={room?.rows ?? event.rows}
									columns={room?.columns ?? event.columns}
								/>
							);
						}}
					</form.Subscribe>
				</div>
			</div>
		</div>
	);
}
