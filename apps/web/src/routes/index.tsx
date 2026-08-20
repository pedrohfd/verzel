import { createFileRoute } from "@tanstack/react-router";
import { env } from "@verzel/env/web";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect, useState } from "react";

import MovieCard from "@/components/movie-card";
import MovieHero from "@/components/movie-hero";
import type { EnrichedMovie } from "@/lib/movies";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

interface HomeResponse {
	results: EnrichedMovie[];
}

function HomeComponent() {
	const [movies, setMovies] = useState<EnrichedMovie[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		fetch(`${env.VITE_SERVER_URL}/api/movies/home`, {
			signal: controller.signal,
		})
			.then((response) => {
				if (!response.ok) throw new Error("Falha ao carregar filmes");
				return response.json() as Promise<HomeResponse>;
			})
			.then((data) => setMovies(data.results))
			.catch((err) => {
				if (err.name !== "AbortError")
					setError("Não foi possível carregar os filmes.");
			});

		return () => controller.abort();
	}, []);

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			{error && <p className="text-destructive text-sm">{error}</p>}

			{!error && !movies && (
				<div className="flex flex-col gap-6">
					<Skeleton className="aspect-21/9 w-full" />
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="aspect-2/3 w-full" />
						))}
					</div>
				</div>
			)}

			{movies && movies.length > 0 && (
				<div className="flex flex-col gap-6">
					<MovieHero movies={movies.slice(0, 4)} />

					<section>
						<h2 className="mb-4 font-semibold text-xl">Populares</h2>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
							{movies.slice(4).map((movie) => (
								<MovieCard key={movie.id} movie={movie} />
							))}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}
