import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Input } from "@verzel/ui/components/input";
import { Label } from "@verzel/ui/components/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { createEvent } from "@/api/requests/events/create-event";
import { searchMovies } from "@/api/requests/movies/search-movies";
import type { TmdbMovie } from "@/api/types";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { maskCurrencyBRL } from "@/lib/masks";
import { requireRole } from "@/lib/route-guards";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/organizer/new")({
	component: NewEventComponent,
	beforeLoad: () => requireRole("organizador"),
});

function NewEventComponent() {
	const navigate = useNavigate();
	const [movieQuery, setMovieQuery] = useState("");
	const [movieResults, setMovieResults] = useState<TmdbMovie[]>([]);
	const [selectedMovie, setSelectedMovie] = useState<TmdbMovie | null>(null);
	const debouncedQuery = useDebouncedValue(movieQuery, 300);

	useEffect(() => {
		if (!debouncedQuery) {
			setMovieResults([]);
			return;
		}

		const controller = new AbortController();
		(async () => {
			const [response, error] = await tryCatch(
				searchMovies(debouncedQuery, controller.signal),
			);
			if (!error) setMovieResults(response);
		})();

		return () => controller.abort();
	}, [debouncedQuery]);

	const form = useForm({
		defaultValues: {
			sessionAt: "",
			venueName: "",
			venueAddress: "",
			price: "",
			rows: "8",
			columns: "10",
		},
		onSubmit: async ({ value }) => {
			if (!selectedMovie) {
				toast.error("Selecione um filme para o evento.");
				return;
			}

			const [, error] = await tryCatch(
				createEvent({
					tmdbMovieId: selectedMovie.id,
					movieTitle: selectedMovie.title,
					moviePosterPath: selectedMovie.poster_path,
					movieBackdropPath: null,
					sessionAt: new Date(value.sessionAt).toISOString(),
					venueName: value.venueName,
					venueAddress: value.venueAddress,
					priceCents: Math.round(Number(value.price.replace(",", ".")) * 100),
					rows: Number(value.rows),
					columns: Number(value.columns),
				}),
			);

			if (error) {
				toast.error("Não foi possível criar o evento.");
				return;
			}

			toast.success(
				"Evento criado como rascunho. Publique-o quando estiver pronto.",
			);
			navigate({ to: "/organizer" });
		},
		validators: {
			onSubmit: z.object({
				sessionAt: z.string().min(1, "Informe a data e hora da sessão"),
				venueName: z.string().min(1, "Informe o nome do local"),
				venueAddress: z.string().min(1, "Informe o endereço do local"),
				price: z.string().min(1, "Informe o preço"),
				rows: z.string().min(1),
				columns: z.string().min(1),
			}),
		},
	});

	return (
		<div className="container mx-auto max-w-2xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Criar evento</h1>

			<div className="mb-6 flex flex-col gap-2">
				<Label htmlFor="movie-search">Filme</Label>
				{selectedMovie ? (
					<div className="flex items-center gap-3 border border-border p-2">
						{selectedMovie.poster_path && (
							<img
								src={tmdbImageUrl(selectedMovie.poster_path, "w342")}
								alt={selectedMovie.title}
								className="h-16 w-11 object-cover"
							/>
						)}
						<span className="flex-1 text-sm">{selectedMovie.title}</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setSelectedMovie(null)}
						>
							Trocar
						</Button>
					</div>
				) : (
					<>
						<Input
							id="movie-search"
							placeholder="Buscar filme no TMDb..."
							value={movieQuery}
							onChange={(e) => setMovieQuery(e.target.value)}
						/>
						{movieResults.length > 0 && (
							<div className="flex flex-col divide-y divide-border border border-border">
								{movieResults.slice(0, 6).map((movie) => (
									<button
										key={movie.id}
										type="button"
										className="flex cursor-pointer items-center gap-3 p-2 text-left hover:bg-muted"
										onClick={() => {
											setSelectedMovie(movie);
											setMovieResults([]);
											setMovieQuery("");
										}}
									>
										{movie.poster_path && (
											<img
												src={tmdbImageUrl(movie.poster_path, "w342")}
												alt={movie.title}
												className="h-16 w-11 object-cover"
											/>
										)}
										<span className="text-sm">{movie.title}</span>
									</button>
								))}
							</div>
						)}
					</>
				)}
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4"
			>
				<form.Field name="sessionAt">
					{(field) => (
						<div className="flex flex-col gap-2">
							<Label htmlFor={field.name}>Data e hora da sessão</Label>
							<Input
								id={field.name}
								type="datetime-local"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.map((err) => (
								<p key={err?.message} className="text-destructive text-xs">
									{err?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="venueName">
					{(field) => (
						<div className="flex flex-col gap-2">
							<Label htmlFor={field.name}>Nome do local</Label>
							<Input
								id={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
							{field.state.meta.errors.map((err) => (
								<p key={err?.message} className="text-destructive text-xs">
									{err?.message}
								</p>
							))}
						</div>
					)}
				</form.Field>

				<form.Field name="venueAddress">
					{(field) => (
						<div className="flex flex-col gap-2">
							<Label htmlFor={field.name}>Endereço</Label>
							<Input
								id={field.name}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
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

				<div className="flex gap-4">
					<form.Field name="rows">
						{(field) => (
							<div className="flex flex-1 flex-col gap-2">
								<Label htmlFor={field.name}>Fileiras</Label>
								<Input
									id={field.name}
									type="number"
									min={1}
									max={26}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="columns">
						{(field) => (
							<div className="flex flex-1 flex-col gap-2">
								<Label htmlFor={field.name}>Assentos por fileira</Label>
								<Input
									id={field.name}
									type="number"
									min={1}
									max={50}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</div>
						)}
					</form.Field>
				</div>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button type="submit" disabled={!canSubmit || isSubmitting}>
							{isSubmitting ? "Criando..." : "Criar evento"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}
