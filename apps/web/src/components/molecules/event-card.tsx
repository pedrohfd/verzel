import { Link } from "@tanstack/react-router";
import { Badge } from "@verzel/ui/components/badge";
import { Button } from "@verzel/ui/components/button";
import { Card, CardContent, CardFooter } from "@verzel/ui/components/card";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { getMovieDetails } from "@/api/requests/movies/get-movie-details";
import type { VerzelEvent } from "@/api/types";
import { tmdbImageUrl } from "@/lib/tmdb-image";
import { tryCatch } from "@/lib/try-catch";

export default function EventCard({
	event,
	sessionCount = 1,
}: {
	event: VerzelEvent;
	sessionCount?: number;
}) {
	const [certification, setCertification] = useState<string | null>(null);
	const sessionDate = new Date(event.sessionAt);
	const hasMultipleSessions = sessionCount > 1;

	useEffect(() => {
		setCertification(null);
		const controller = new AbortController();

		(async () => {
			const [details, error] = await tryCatch(
				getMovieDetails(event.tmdbMovieId, controller.signal),
			);
			if (!error && details.certification) {
				setCertification(details.certification);
			}
		})();

		return () => controller.abort();
	}, [event.tmdbMovieId]);

	return (
		<Card className="gap-2">
			{event.moviePosterPath && (
				<img
					src={tmdbImageUrl(event.moviePosterPath, "w342")}
					alt={event.movieTitle}
					className="aspect-2/3 w-full object-cover"
					loading="lazy"
					decoding="async"
				/>
			)}
			<CardContent className="flex flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<h3 className="font-semibold text-sm">{event.movieTitle}</h3>
					{certification && (
						<Badge variant="outline" className="shrink-0">
							{certification}
						</Badge>
					)}
				</div>
				<p className="flex items-center gap-1 text-muted-foreground text-xs">
					<CalendarIcon className="size-3 shrink-0" />
					{hasMultipleSessions
						? "Várias Sessões"
						: `${sessionDate.toLocaleDateString("pt-BR", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
							})} às ${sessionDate.toLocaleTimeString("pt-BR", {
								hour: "2-digit",
								minute: "2-digit",
							})}`}
				</p>
				{!hasMultipleSessions && (
					<p className="flex items-center gap-1 text-muted-foreground text-xs">
						<MapPinIcon className="size-3 shrink-0" />
						{event.venueName}
					</p>
				)}
			</CardContent>
			<CardFooter className="border-t-0 pt-0">
				<Link
					to="/events/$eventId"
					params={{ eventId: event.id }}
					className="w-full"
				>
					<Button variant="outline" className="w-full">
						Ver sessões
					</Button>
				</Link>
			</CardFooter>
		</Card>
	);
}
