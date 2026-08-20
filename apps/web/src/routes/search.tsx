import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect, useState } from "react";

import { getPublishedEvents } from "@/api/requests/events/get-published-events";
import type { VerzelEvent } from "@/api/types";
import EventCard from "@/components/event-card";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/search")({
	component: SearchComponent,
	validateSearch: (search: Record<string, unknown>) => ({
		q: typeof search.q === "string" ? search.q : "",
	}),
});

function SearchComponent() {
	const { q } = Route.useSearch();
	const [results, setResults] = useState<VerzelEvent[] | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setResults(null);
		setError(null);

		if (!q) {
			setResults([]);
			return;
		}

		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getPublishedEvents(q, controller.signal),
			);

			if (fetchError) {
				setError("Não foi possível buscar os eventos.");
				return;
			}

			setResults(response);
		})();

		return () => controller.abort();
	}, [q]);

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<h1 className="mb-4 font-semibold text-xl">Resultados para "{q}"</h1>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{!error && results === null && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="aspect-2/3 w-full" />
					))}
				</div>
			)}

			{results && results.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Nenhum evento encontrado para "{q}".
				</p>
			)}

			{results && results.length > 0 && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{results.map((event) => (
						<EventCard key={event.id} event={event} />
					))}
				</div>
			)}
		</div>
	);
}
