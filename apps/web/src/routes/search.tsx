import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect, useState } from "react";

import { getPublishedEvents } from "@/api/requests/events/get-published-events";
import { getPublishedVenues } from "@/api/requests/events/get-published-venues";
import type { VerzelEvent } from "@/api/types";
import BackLink from "@/components/molecules/back-link";
import EventCard from "@/components/molecules/event-card";
import EventFiltersBar, {
	type EventFiltersValue,
} from "@/components/organisms/event-filters-bar";
import { authClient } from "@/lib/auth-client";
import {
	countSessionsByMovie,
	dedupeEventsByMovie,
} from "@/lib/dedupe-events-by-movie";
import { parseNumberSearchParam } from "@/lib/parse-number-search-param";
import type { Role } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

interface SearchRouteSearch {
	q: string;
	date?: string;
	venue?: string;
	priceMin?: number;
	priceMax?: number;
}

export const Route = createFileRoute("/search")({
	component: SearchComponent,
	validateSearch: (search: Record<string, unknown>): SearchRouteSearch => ({
		q: typeof search.q === "string" ? search.q : "",
		date: typeof search.date === "string" ? search.date : "",
		venue: typeof search.venue === "string" ? search.venue : "",
		priceMin: parseNumberSearchParam(search.priceMin),
		priceMax: parseNumberSearchParam(search.priceMax),
	}),
});

function SearchComponent() {
	const rawFilters = Route.useSearch();
	const { q } = rawFilters;
	const filters: EventFiltersValue = {
		date: rawFilters.date ?? "",
		venue: rawFilters.venue ?? "",
		priceMin: rawFilters.priceMin,
		priceMax: rawFilters.priceMax,
	};
	const navigate = Route.useNavigate();
	const [results, setResults] = useState<VerzelEvent[] | null>(null);
	const [sessionCounts, setSessionCounts] = useState<Record<
		number,
		number
	> | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [venues, setVenues] = useState<string[]>([]);
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;
	const organizerId = role === "organizador" ? session?.user.id : undefined;

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
				getPublishedEvents(
					{
						search: q,
						organizerId,
						date: filters.date || undefined,
						venue: filters.venue || undefined,
						priceMin: filters.priceMin,
						priceMax: filters.priceMax,
					},
					controller.signal,
				),
			);

			if (fetchError) {
				setError("Não foi possível buscar as sessões.");
				return;
			}

			setResults(dedupeEventsByMovie(response));
			setSessionCounts(countSessionsByMovie(response));
		})();

		return () => controller.abort();
	}, [
		q,
		organizerId,
		filters.date,
		filters.venue,
		filters.priceMin,
		filters.priceMax,
	]);

	useEffect(() => {
		const controller = new AbortController();

		getPublishedVenues(controller.signal)
			.then(setVenues)
			.catch(() => {});

		return () => controller.abort();
	}, []);

	function handleFiltersChange(next: EventFiltersValue) {
		navigate({ search: (prev) => ({ q: prev.q, ...next }) });
	}

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			<BackLink to="/" label="Início" />
			<h1 className="mb-4 font-semibold text-xl">Resultados para "{q}"</h1>

			<div className="mb-4">
				<EventFiltersBar
					venues={venues}
					filters={filters}
					onChange={handleFiltersChange}
				/>
			</div>

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
					Nenhuma sessão encontrada para "{q}".
				</p>
			)}

			{results && results.length > 0 && (
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
					{results.map((event) => (
						<EventCard
							key={event.id}
							event={event}
							sessionCount={sessionCounts?.[event.tmdbMovieId]}
						/>
					))}
				</div>
			)}
		</div>
	);
}
