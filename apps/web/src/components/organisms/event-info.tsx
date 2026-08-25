import { Badge } from "@verzel/ui/components/badge";
import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { getMovieDetails } from "@/api/requests/movies/get-movie-details";
import type { MovieDetails, VerzelEvent } from "@/api/types";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

export default function EventInfo({ event }: { event: VerzelEvent }) {
	const [details, setDetails] = useState<MovieDetails | null>(null);

	useEffect(() => {
		setDetails(null);
		const controller = new AbortController();

		(async () => {
			const [movieDetails, error] = await tryCatch(
				getMovieDetails(event.tmdbMovieId, controller.signal),
			);
			if (error) return;
			setDetails(movieDetails);
		})();

		return () => controller.abort();
	}, [event.tmdbMovieId]);

	const creditsLine =
		details && (details.director || details.cast.length > 0)
			? [
					details.director && `Direção: ${details.director}`,
					details.cast.length > 0 && `Elenco: ${details.cast.join(", ")}`,
				]
					.filter(Boolean)
					.join(" · ")
			: null;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				{event.moviePosterPath ? (
					<img
						src={tmdbImageUrl(event.moviePosterPath, "w342")}
						alt={event.movieTitle}
						className="h-96 w-64 object-cover"
						decoding="async"
					/>
				) : (
					<div className="flex h-96 w-64 flex-col items-center justify-center gap-1 border border-dashed text-center">
						<ImageIcon className="size-8 text-muted-foreground" />
						<span className="text-muted-foreground text-xs">
							Pôster do filme
						</span>
					</div>
				)}
				<h1 className="font-bold text-2xl">{event.movieTitle}</h1>
			</div>

			{details && (
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap gap-2">
						{details.genre && (
							<Badge variant="secondary">{details.genre}</Badge>
						)}
						{details.certification && (
							<Badge variant="outline">{details.certification}</Badge>
						)}
						{details.runtime && (
							<Badge variant="outline">{details.runtime}min</Badge>
						)}
					</div>
					{details.overview && <p className="text-sm">{details.overview}</p>}
					{creditsLine && (
						<p className="text-muted-foreground text-sm">{creditsLine}</p>
					)}
				</div>
			)}
		</div>
	);
}
