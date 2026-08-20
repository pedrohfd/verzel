import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect } from "react";

import { getNowPlayingMovies } from "@/api/requests/movies/get-now-playing-movies";
import MovieCard from "@/components/movie-card";
import MovieHero from "@/components/movie-hero";
import { tryCatch } from "@/lib/try-catch";
import { useMoviesStore } from "@/stores/movies-store";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	const movies = useMoviesStore((state) => state.movies);
	const error = useMoviesStore((state) => state.error);
	const setMovies = useMoviesStore((state) => state.setMovies);
	const setError = useMoviesStore((state) => state.setError);

	const getNowPlayingMoviesFn = async (controller: AbortController) => {
		const [response, error] = await tryCatch(
			getNowPlayingMovies(controller.signal),
		);

		if (error) {
			setError("Não foi possível carregar os filmes.");
		}

		setMovies(response);
	};

	useEffect(() => {
		const controller = new AbortController();

		getNowPlayingMoviesFn(controller);

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
						<h2 className="mb-4 font-semibold text-xl">Em cartaz</h2>
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
