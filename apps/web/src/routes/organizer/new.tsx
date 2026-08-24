import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

import { createEvent } from "@/api/requests/events/create-event";
import { getMovieDetails } from "@/api/requests/movies/get-movie-details";
import { getMyRooms } from "@/api/requests/rooms/get-my-rooms";
import {
	getRoomSchedule,
	type RoomScheduleSlot,
} from "@/api/requests/rooms/get-room-schedule";
import type { CinemaRoom, TmdbMovie } from "@/api/types";
import SessionTimePicker from "@/components/molecules/session-time-picker";
import CinemaRoomPreview from "@/components/organisms/cinema-room-preview";
import MovieSearchField from "@/components/organisms/movie-search-field";
import { authClient } from "@/lib/auth-client";
import { findSlotConflict } from "@/lib/find-slot-conflict";
import { formatAddress } from "@/lib/format-address";
import { maskCurrencyBRL } from "@/lib/masks";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

const DEFAULT_DURATION_MINUTES = 120;

const DRAFT_STORAGE_KEY = "organizer:new-event-draft";

interface NewEventSearch {
	roomId?: string;
}

interface NewEventDraft {
	selectedMovie: TmdbMovie | null;
	sessionAt: string;
	price: string;
}

export const Route = createFileRoute("/organizer/new")({
	component: NewEventComponent,
	beforeLoad: () => requireRole("organizador"),
	validateSearch: (search: Record<string, unknown>): NewEventSearch => ({
		roomId: typeof search.roomId === "string" ? search.roomId : undefined,
	}),
});

interface SessionCinemaFields {
	cinemaName?: string;
	street?: string;
	number?: string;
	complement?: string | null;
	neighborhood?: string;
	city?: string;
	state?: string;
}

function NewEventComponent() {
	const navigate = useNavigate();
	const { roomId: returnedRoomId } = Route.useSearch();
	const { data: session } = authClient.useSession();
	const cinema = session?.user as SessionCinemaFields | undefined;
	const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);

	const [rooms, setRooms] = useState<CinemaRoom[]>([]);
	const [selectedRoomId, setSelectedRoomId] = useState("");
	const [occupiedSlots, setOccupiedSlots] = useState<RoomScheduleSlot[]>([]);
	const [occupiedSlotsLoading, setOccupiedSlotsLoading] = useState(false);
	const [movieDuration, setMovieDuration] = useState<number | null>(null);

	useEffect(() => {
		const controller = new AbortController();
		(async () => {
			const [response, error] = await tryCatch(getMyRooms(controller.signal));
			if (!error) setRooms(response);
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
			const [response, error] = await tryCatch(
				getRoomSchedule(selectedRoomId, { signal: controller.signal }),
			);
			if (!error) setOccupiedSlots(response);
			if (!controller.signal.aborted) setOccupiedSlotsLoading(false);
		})();
		return () => controller.abort();
	}, [selectedRoomId]);

	useEffect(() => {
		if (!selectedMovie) {
			setMovieDuration(null);
			return;
		}

		const controller = new AbortController();
		(async () => {
			const [response, error] = await tryCatch(
				getMovieDetails(selectedMovie.id, controller.signal),
			);
			if (!error)
				setMovieDuration(response.runtime ?? DEFAULT_DURATION_MINUTES);
		})();
		return () => controller.abort();
	}, [selectedMovie]);

	const form = useForm({
		defaultValues: {
			sessionAt: "",
			price: "",
			roomId: "",
		},
		onSubmit: async ({ value }) => {
			if (!selectedMovie) {
				toast.error("Selecione um filme para a sessão.");
				return;
			}

			const [, error] = await tryCatch(
				createEvent({
					tmdbMovieId: selectedMovie.id,
					movieTitle: selectedMovie.title,
					moviePosterPath: selectedMovie.poster_path,
					movieBackdropPath: selectedMovie.backdrop_path,
					sessionAt: new Date(value.sessionAt).toISOString(),
					priceCents: Math.round(Number(value.price.replace(",", ".")) * 100),
					roomId: value.roomId,
				}),
			);

			if (error) {
				toast.error("Não foi possível criar a sessão.");
				return;
			}

			toast.success(
				"Sessão criada como rascunho. Publique-a quando estiver pronta.",
			);
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

		const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);
		if (stored) {
			const draft: NewEventDraft = JSON.parse(stored);
			setSelectedMovie(draft.selectedMovie);
			form.setFieldValue("sessionAt", draft.sessionAt);
			form.setFieldValue("price", draft.price);
			sessionStorage.removeItem(DRAFT_STORAGE_KEY);
		}

		form.setFieldValue("roomId", returnedRoomId);
		setSelectedRoomId(returnedRoomId);
		navigate({ to: "/organizer/new", search: {}, replace: true });
	}, [returnedRoomId]);

	function handleCreateRoomClick() {
		const draft: NewEventDraft = {
			selectedMovie,
			sessionAt: form.getFieldValue("sessionAt"),
			price: form.getFieldValue("price"),
		};
		sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
		navigate({
			to: "/organizer/rooms/new",
			search: { returnTo: "new-event" },
		});
	}

	return (
		<div className="container mx-auto max-w-[1600px] px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Criar sessão</h1>

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
										<Button
											type="button"
											variant="link"
											size="sm"
											className="h-auto p-0"
											onClick={handleCreateRoomClick}
										>
											Criar nova sala
										</Button>
									</div>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											field.handleChange(value ?? "");
											setSelectedRoomId(value ?? "");
										}}
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
									{rooms.length === 0 && (
										<p className="text-muted-foreground text-xs">
											Você ainda não tem nenhuma sala cadastrada.
										</p>
									)}
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

						<form.Subscribe
							selector={(state) => ({
								canSubmit: state.canSubmit,
								isSubmitting: state.isSubmitting,
							})}
						>
							{({ canSubmit, isSubmitting }) => (
								<Button type="submit" disabled={!canSubmit || isSubmitting}>
									{isSubmitting ? "Criando..." : "Criar sessão"}
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
									rows={room?.rows ?? 0}
									columns={room?.columns ?? 0}
								/>
							);
						}}
					</form.Subscribe>
				</div>
			</div>
		</div>
	);
}
