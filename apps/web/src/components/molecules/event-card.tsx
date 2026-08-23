import { Link } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import { Card, CardContent, CardFooter } from "@verzel/ui/components/card";

import type { VerzelEvent } from "@/api/types";
import { formatPriceCents } from "@/lib/format-price";
import { tmdbImageUrl } from "@/lib/tmdb-image";

export default function EventCard({ event }: { event: VerzelEvent }) {
	const sessionDate = new Date(event.sessionAt);

	return (
		<Card className="gap-2">
			{event.moviePosterPath && (
				<img
					src={tmdbImageUrl(event.moviePosterPath, "w342")}
					alt={event.movieTitle}
					className="aspect-2/3 w-full object-cover"
					loading="lazy"
				/>
			)}
			<CardContent className="flex flex-col gap-1">
				<h3 className="font-semibold text-sm">{event.movieTitle}</h3>
				<p className="text-muted-foreground text-xs">
					{sessionDate.toLocaleDateString("pt-BR", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
					})}{" "}
					às{" "}
					{sessionDate.toLocaleTimeString("pt-BR", {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</p>
				<p className="text-muted-foreground text-xs">{event.venueName}</p>
				<p className="font-medium text-xs">
					{formatPriceCents(event.priceCents)}
				</p>
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
