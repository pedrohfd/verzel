import { Link } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@verzel/ui/components/carousel";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@verzel/ui/components/dialog";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { Play, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getMovieTrailers } from "@/api/requests/movies/get-movie-trailers";
import type { MovieTrailer, VerzelEvent } from "@/api/types";
import { formatPriceCents } from "@/lib/format-price";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

const AUTOPLAY_INTERVAL_MS = 6000;

export default function EventHero({ events }: { events: VerzelEvent[] }) {
	const [api, setApi] = useState<CarouselApi>();
	const [activeIndex, setActiveIndex] = useState(0);
	const [isTrailerOpen, setIsTrailerOpen] = useState(false);
	const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
	const [trailers, setTrailers] = useState<MovieTrailer[]>([]);
	const [selectedTrailerIndex, setSelectedTrailerIndex] = useState(0);
	const trailerControllerRef = useRef<AbortController | null>(null);
	const event = events[activeIndex];
	const selectedTrailer = trailers[selectedTrailerIndex];

	async function handlePlayTrailer() {
		setIsTrailerOpen(true);
		setIsLoadingTrailer(true);

		const controller = new AbortController();
		trailerControllerRef.current = controller;

		const [movieTrailers, error] = await tryCatch(
			getMovieTrailers(event.tmdbMovieId, controller.signal),
		);

		if (error) {
			setTrailers([]);
		} else {
			setTrailers(movieTrailers);
			setSelectedTrailerIndex(0);
		}

		setIsLoadingTrailer(false);
	}

	useEffect(() => {
		if (!api || events.length <= 1 || isTrailerOpen) return;

		const interval = setInterval(() => {
			api.scrollNext();
		}, AUTOPLAY_INTERVAL_MS);

		return () => clearInterval(interval);
	}, [api, events.length, isTrailerOpen, activeIndex]);

	useEffect(() => {
		if (!api) return;

		function onSelect() {
			if (!api) return;
			setActiveIndex(api.selectedScrollSnap());
		}

		api.on("select", onSelect);
		return () => {
			api.off("select", onSelect);
		};
	}, [api]);

	useEffect(() => {
		trailerControllerRef.current?.abort();
		setIsTrailerOpen(false);
		setTrailers([]);
		setSelectedTrailerIndex(0);
	}, [activeIndex]);

	useEffect(() => {
		for (const event of events) {
			if (!event.movieBackdropPath) continue;
			const preload = new Image();
			preload.src = tmdbImageUrl(event.movieBackdropPath, "w1280");
		}
	}, [events]);

	if (!event) return null;

	const sessionDate = new Date(event.sessionAt);

	return (
		<div className="group relative aspect-21/9 w-full overflow-hidden bg-muted">
			<Carousel
				setApi={setApi}
				opts={{ loop: true }}
				className="absolute inset-0 h-full w-full"
			>
				<CarouselContent className="ml-0 h-full">
					{events.map((e) => (
						<CarouselItem key={e.id} className="relative h-full pl-0">
							{e.movieBackdropPath && (
								<img
									src={tmdbImageUrl(e.movieBackdropPath, "w1280")}
									alt={e.movieTitle}
									className="absolute inset-0 h-full w-full object-cover"
									fetchPriority="high"
								/>
							)}
							<div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
						</CarouselItem>
					))}
				</CarouselContent>

				{events.length > 1 && (
					<>
						<div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-linear-to-r from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
						<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4 bg-linear-to-l from-black/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
						<CarouselPrevious
							size="icon"
							aria-label="Sessão anterior"
							className="top-4 left-4 z-20 transition-none"
						/>
						<CarouselNext
							size="icon"
							aria-label="Próxima sessão"
							className="top-4 right-4 z-20 transition-none"
						/>
					</>
				)}
			</Carousel>

			<div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6">
				<h1 className="font-bold text-3xl text-white">{event.movieTitle}</h1>
				<p className="text-sm text-white/80">
					{sessionDate.toLocaleDateString("pt-BR", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
					})}{" "}
					· {event.venueName} · {formatPriceCents(event.priceCents)}
				</p>
				<div className="flex items-center gap-2">
					<Link to="/events/$eventId" params={{ eventId: event.id }}>
						<Button className="bg-destructive text-white hover:bg-destructive/90">
							Ingressos
						</Button>
					</Link>
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

			<div className="absolute right-6 bottom-6 z-10 flex gap-1.5">
				{events.map((e, index) => (
					<button
						key={e.id}
						type="button"
						aria-label={`Ver ${e.movieTitle}`}
						onClick={() => api?.scrollTo(index)}
						className={`size-2 cursor-pointer rounded-full transition-colors ${
							index === activeIndex ? "bg-destructive" : "bg-white/40"
						}`}
					/>
				))}
			</div>

			<Dialog open={isTrailerOpen} onOpenChange={setIsTrailerOpen}>
				<DialogContent className="max-w-3xl p-0" showCloseButton={false}>
					<div className="flex items-center justify-between border-border border-b p-4">
						<DialogTitle>{event.movieTitle}</DialogTitle>
						<DialogClose className="cursor-pointer rounded-none opacity-70 outline-none transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none">
							<XIcon className="size-4" />
							<span className="sr-only">Fechar</span>
						</DialogClose>
					</div>
					<div className="aspect-video w-full">
						{isLoadingTrailer && <Skeleton className="h-full w-full" />}
						{!isLoadingTrailer && selectedTrailer && (
							<iframe
								key={selectedTrailer.key}
								className="h-full w-full"
								src={`https://www.youtube.com/embed/${selectedTrailer.key}?autoplay=0`}
								title={selectedTrailer.name || `Trailer de ${event.movieTitle}`}
								allow="autoplay; encrypted-media"
								allowFullScreen
							/>
						)}
						{!isLoadingTrailer && !selectedTrailer && (
							<p className="flex h-full w-full items-center justify-center p-6 text-center text-muted-foreground text-sm">
								Trailer não disponível para este filme.
							</p>
						)}
					</div>
					{!isLoadingTrailer && trailers.length > 1 && (
						<div className="flex flex-wrap gap-2 p-4 pt-0">
							{trailers.map((trailer, index) => (
								<Button
									key={trailer.key}
									type="button"
									size="sm"
									variant={
										index === selectedTrailerIndex ? "default" : "outline"
									}
									onClick={() => setSelectedTrailerIndex(index)}
								>
									{`Trailer ${index + 1}`}
								</Button>
							))}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
