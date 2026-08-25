import { createFileRoute } from "@tanstack/react-router";
import { Skeleton } from "@verzel/ui/components/skeleton";
import { useEffect, useState } from "react";

import { getPublishedEvents } from "@/api/requests/events/get-published-events";
import { getPublishedVenues } from "@/api/requests/events/get-published-venues";
import EventCard from "@/components/molecules/event-card";
import EventFiltersBar, {
	type EventFiltersValue,
} from "@/components/organisms/event-filters-bar";
import EventHero from "@/components/organisms/event-hero";
import { authClient } from "@/lib/auth-client";
import {
	countSessionsByMovie,
	dedupeEventsByMovie,
} from "@/lib/dedupe-events-by-movie";
import { parseNumberSearchParam } from "@/lib/parse-number-search-param";
import type { Role } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";
import { useEventsStore } from "@/stores/events-store";

interface HomeSearch {
	date?: string;
	venue?: string;
	priceMin?: number;
	priceMax?: number;
}

export const Route = createFileRoute("/")({
	component: HomeComponent,
	validateSearch: (search: Record<string, unknown>): HomeSearch => ({
		date: typeof search.date === "string" ? search.date : "",
		venue: typeof search.venue === "string" ? search.venue : "",
		priceMin: parseNumberSearchParam(search.priceMin),
		priceMax: parseNumberSearchParam(search.priceMax),
	}),
});

function HomeComponent() {
	const rawFilters = Route.useSearch();
	const filters: EventFiltersValue = {
		date: rawFilters.date ?? "",
		venue: rawFilters.venue ?? "",
		priceMin: rawFilters.priceMin,
		priceMax: rawFilters.priceMax,
	};
	const navigate = Route.useNavigate();
	const events = useEventsStore((state) => state.events);
	const sessionCounts = useEventsStore((state) => state.sessionCounts);
	const error = useEventsStore((state) => state.error);
	const setEvents = useEventsStore((state) => state.setEvents);
	const setSessionCounts = useEventsStore((state) => state.setSessionCounts);
	const setError = useEventsStore((state) => state.setError);
	const [venues, setVenues] = useState<string[]>([]);
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;
	const organizerId = role === "organizador" ? session?.user.id : undefined;

	const getPublishedEventsFn = async (controller: AbortController) => {
		const [response, error] = await tryCatch(
			getPublishedEvents(
				{
					organizerId,
					date: filters.date || undefined,
					venue: filters.venue || undefined,
					priceMin: filters.priceMin,
					priceMax: filters.priceMax,
				},
				controller.signal,
			),
		);

		if (error) {
			setError("Não foi possível carregar as sessões.");
			return;
		}

		setEvents(dedupeEventsByMovie(response));
		setSessionCounts(countSessionsByMovie(response));
	};

	useEffect(() => {
		const controller = new AbortController();

		getPublishedEventsFn(controller);

		return () => controller.abort();
	}, [
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
		navigate({ search: () => next });
	}

	return (
		<div className="container mx-auto max-w-5xl px-4 py-6">
			{error && <p className="text-destructive text-sm">{error}</p>}

			{!error && !events && (
				<div className="flex flex-col gap-6">
					<Skeleton className="aspect-21/9 w-full" />
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="aspect-2/3 w-full" />
						))}
					</div>
				</div>
			)}

			{events && events.length === 0 && (
				<p className="text-muted-foreground text-sm">
					Nenhuma sessão publicada no momento.
				</p>
			)}

			{events && events.length > 0 && (
				<div className="flex flex-col gap-6">
					<EventHero events={events.slice(0, 4)} />

					<EventFiltersBar
						venues={venues}
						filters={filters}
						onChange={handleFiltersChange}
					/>

					<section>
						<h2 className="mb-4 font-semibold text-xl">Sessões em cartaz</h2>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
							{events.map((event) => (
								<EventCard
									key={event.id}
									event={event}
									sessionCount={sessionCounts?.[event.tmdbMovieId]}
								/>
							))}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}
