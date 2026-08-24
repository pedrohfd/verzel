import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getPublishedEvents } from "@/api/requests/events/get-published-events";
import type { VerzelEvent } from "@/api/types";
import { authClient } from "@/lib/auth-client";
import { isSameDay } from "@/lib/format-session-date-label";
import type { Role } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export type SessionDateOption = { key: string; date: Date };
export type SessionTimeOption = {
	id: string;
	date: Date;
	roomName: string | null;
};

function sortByDate(a: VerzelEvent, b: VerzelEvent) {
	return new Date(a.sessionAt).getTime() - new Date(b.sessionAt).getTime();
}

export function useEventSessions(event: VerzelEvent | null) {
	const navigate = useNavigate();
	const [sessions, setSessions] = useState<VerzelEvent[]>([]);
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;
	const organizerId = role === "organizador" ? session?.user.id : undefined;

	useEffect(() => {
		if (!event) return;

		const controller = new AbortController();

		(async () => {
			const [response, error] = await tryCatch(
				getPublishedEvents(
					{ tmdbMovieId: event.tmdbMovieId, organizerId },
					controller.signal,
				),
			);
			if (error) return;
			setSessions(response);
		})();

		return () => controller.abort();
	}, [event, organizerId]);

	function goToEvent(target: VerzelEvent) {
		if (!event || target.id === event.id) return;
		navigate({
			to: "/events/$eventId",
			params: { eventId: target.id },
			replace: true,
			resetScroll: false,
		});
	}

	if (!event) {
		return {
			cinemas: [],
			venueName: "",
			onSelectCinema: () => {},
			dates: [],
			selectedDateKey: "",
			onSelectDate: () => {},
			times: [],
			selectedTimeId: "",
			onSelectTime: () => {},
		};
	}

	const cinemas = [...new Set(sessions.map((s) => s.venueName))].sort((a, b) =>
		a.localeCompare(b),
	);

	const sessionsForVenue = sessions
		.filter((s) => s.venueName === event.venueName)
		.sort(sortByDate);

	const seenDateKeys = new Set<string>();
	const dates = sessionsForVenue
		.filter((s) => {
			const key = new Date(s.sessionAt).toDateString();
			if (seenDateKeys.has(key)) return false;
			seenDateKeys.add(key);
			return true;
		})
		.map((s) => ({
			key: new Date(s.sessionAt).toDateString(),
			date: new Date(s.sessionAt),
		}));

	const selectedDate = new Date(event.sessionAt);
	const sessionsForDate = sessionsForVenue.filter((s) =>
		isSameDay(new Date(s.sessionAt), selectedDate),
	);
	const times = sessionsForDate.map((s) => ({
		id: s.id,
		date: new Date(s.sessionAt),
		roomName: s.roomName ?? null,
	}));

	return {
		cinemas,
		venueName: event.venueName,
		onSelectCinema(venue: string) {
			const target = sessions
				.filter((s) => s.venueName === venue)
				.sort(sortByDate)[0];
			if (target) goToEvent(target);
		},
		dates,
		selectedDateKey: selectedDate.toDateString(),
		onSelectDate(key: string) {
			const target = sessionsForVenue.find(
				(s) => new Date(s.sessionAt).toDateString() === key,
			);
			if (target) goToEvent(target);
		},
		times,
		selectedTimeId: event.id,
		onSelectTime(id: string) {
			const target = sessions.find((s) => s.id === id);
			if (target) goToEvent(target);
		},
	};
}
