import { Button } from "@verzel/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@verzel/ui/components/dialog";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getMovieTrailer } from "@/api/requests/movies/get-movie-trailer";
import type { EnrichedMovie } from "@/api/types";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

export default function MovieHero({ movies }: { movies: EnrichedMovie[] }) {
	const [activeIndex, setActiveIndex] = useState(0);
	const [isTrailerOpen, setIsTrailerOpen] = useState(false);
	const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
	const [trailerKey, setTrailerKey] = useState<string | null>(null);
	const trailerControllerRef = useRef<AbortController | null>(null);
	const movie = movies[activeIndex];

	async function handlePlayTrailer() {
		setIsTrailerOpen(true);
		setIsLoadingTrailer(true);

		const controller = new AbortController();
		trailerControllerRef.current = controller;

		const [key, error] = await tryCatch(
			getMovieTrailer(movie.id, controller.signal),
		);

		if (error) {
			setTrailerKey(null);
		} else {
			setTrailerKey(key);
		}

		setIsLoadingTrailer(false);
	}

	useEffect(() => {
		if (movies.length <= 1 || isTrailerOpen) return;

		const interval = setInterval(() => {
			setActiveIndex((i) => (i + 1) % movies.length);
		}, 6000);

		return () => clearInterval(interval);
	}, [activeIndex, movies.length, isTrailerOpen]);

	useEffect(() => {
		trailerControllerRef.current?.abort();
		setIsTrailerOpen(false);
		setTrailerKey(null);
	}, [activeIndex]);

	useEffect(() => {
		for (const movie of movies) {
			if (!movie.backdrop_path) continue;
			const preload = new Image();
			preload.src = tmdbImageUrl(movie.backdrop_path, "w1280");
		}
	}, [movies]);

	if (!movie) return null;

	return (
		<div className="group relative aspect-21/9 w-full overflow-hidden bg-muted">
			{movie.backdrop_path && (
				<img
					src={tmdbImageUrl(movie.backdrop_path, "w1280")}
					alt={movie.title}
					className="absolute inset-0 h-full w-full object-cover"
					fetchPriority="high"
				/>
			)}
			<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

			<div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6">
				{movie.genre && (
					<span className="w-fit rounded-full bg-destructive px-3 py-1 font-medium text-white text-xs">
						{movie.genre}
					</span>
				)}
				<h1 className="font-bold text-3xl text-white">{movie.title}</h1>
				<p className="text-sm text-white/80">
					{movie.certification} · {movie.runtime ?? "—"} min · {movie.audio}
				</p>
				<div className="flex items-center gap-2">
					<Button className="bg-destructive text-white hover:bg-destructive/90">
						Ingressos
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Assistir trailer"
						onClick={handlePlayTrailer}
					>
						<Play />
					</Button>
				</div>
			</div>

			{movies.length > 1 && (
				<>
					<div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
					<div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
					<Button
						variant="outline"
						size="icon"
						aria-label="Filme anterior"
						onClick={() =>
							setActiveIndex((i) => (i - 1 + movies.length) % movies.length)
						}
						className="absolute top-1/2 left-4 z-10 -translate-y-1/2 transition-none active:not-aria-[haspopup]:-translate-y-1/2"
					>
						<ChevronLeft />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Próximo filme"
						onClick={() => setActiveIndex((i) => (i + 1) % movies.length)}
						className="absolute top-1/2 right-4 z-10 -translate-y-1/2 transition-none active:not-aria-[haspopup]:-translate-y-1/2"
					>
						<ChevronRight />
					</Button>
				</>
			)}

			<div className="absolute right-6 bottom-6 flex gap-1.5">
				{movies.map((m, index) => (
					<button
						key={m.id}
						type="button"
						aria-label={`Ver ${m.title}`}
						onClick={() => setActiveIndex(index)}
						className={`size-2 rounded-full transition-colors ${
							index === activeIndex ? "bg-destructive" : "bg-white/40"
						}`}
					/>
				))}
			</div>

			<Dialog open={isTrailerOpen} onOpenChange={setIsTrailerOpen}>
				<DialogContent className="max-w-3xl p-0">
					<DialogTitle className="sr-only">
						Trailer de {movie.title}
					</DialogTitle>
					<div className="aspect-video w-full">
						{isLoadingTrailer && <Skeleton className="h-full w-full" />}
						{!isLoadingTrailer && trailerKey && (
							<iframe
								className="h-full w-full"
								src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1`}
								title={`Trailer de ${movie.title}`}
								allow="autoplay; encrypted-media"
								allowFullScreen
							/>
						)}
						{!isLoadingTrailer && !trailerKey && (
							<p className="flex h-full w-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
								Trailer não disponível para este filme.
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
