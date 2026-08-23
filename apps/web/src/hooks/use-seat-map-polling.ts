import { useEffect, useState } from "react";

import { getEventSeats } from "@/api/requests/events/get-event-seats";
import type { Seat } from "@/api/types";
import { tryCatch } from "@/lib/try-catch";

const DEFAULT_INTERVAL_MS = 4000;

export function useSeatMapPolling(
	eventId: string | undefined,
	enabled: boolean,
	intervalMs = DEFAULT_INTERVAL_MS,
) {
	const [seats, setSeats] = useState<Seat[] | null>(null);

	useEffect(() => {
		if (!eventId || !enabled) return;

		const controller = new AbortController();

		async function poll() {
			if (document.hidden || !eventId) return;
			const [data, error] = await tryCatch(
				getEventSeats(eventId, controller.signal),
			);
			if (!error) setSeats(data);
		}

		const id = setInterval(poll, intervalMs);

		return () => {
			controller.abort();
			clearInterval(id);
		};
	}, [eventId, enabled, intervalMs]);

	return seats;
}
