import { createFileRoute } from "@tanstack/react-router";
import { env } from "@verzel/env/web";
import {
	Card,
	CardContent,
	CardFooter,
	CardTitle,
} from "@verzel/ui/components/card";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect, useState } from "react";

import { tmdbImageUrl } from "@/lib/tmdb-image";

interface TmdbMovie {
	id: number;
	title: string;
	poster_path: string | null;
	release_date: string;
	vote_average: number;
}

interface TrendingResponse {
	results: TmdbMovie[];
}

export const Route = createFileRoute("/movies")({
	component: MoviesComponent,
});

function MoviesComponent() {
	const [movies, setMovies] = useState<TmdbMovie[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		fetch(`${env.VITE_SERVER_URL}/api/movies/trending`, {
			signal: controller.signal,
		})
			.then((response) => {
				if (!response.ok) throw new Error("Falha ao carregar filmes em alta");
				return response.json() as Promise<TrendingResponse>;
			})
			.then((data) => setMovies(data.results))
			.catch((err) => {
				if (err.name !== "AbortError")
					setError("Não foi possível carregar os filmes em alta.");
			});

		return () => controller.abort();
	}, []);

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<h1 className="mb-4 font-medium text-xl">Em alta esta semana</h1>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{!error && !movies && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{Array.from({ length: 10 }).map((_, i) => (
						<Skeleton key={i} className="aspect-2/3 w-full" />
					))}
				</div>
			)}

			{movies && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
					{movies.map((movie) => (
						<Card key={movie.id} className="gap-2">
							{movie.poster_path && (
								<img
									src={tmdbImageUrl(movie.poster_path, "w342")}
									alt={movie.title}
									className="aspect-2/3 w-full object-cover"
									loading="lazy"
								/>
							)}
							<CardContent>
								<CardTitle>{movie.title}</CardTitle>
							</CardContent>
							<CardFooter className="justify-between text-muted-foreground">
								<span>{movie.release_date?.slice(0, 4)}</span>
								<span>★ {movie.vote_average.toFixed(1)}</span>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
