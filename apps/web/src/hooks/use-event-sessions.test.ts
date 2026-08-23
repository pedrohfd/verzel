import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VerzelEvent } from "@/api/types";

const { getPublishedEventsMock, navigateMock } = vi.hoisted(() => ({
	getPublishedEventsMock: vi.fn(),
	navigateMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateMock,
}));

vi.mock("@/api/requests/events/get-published-events", () => ({
	getPublishedEvents: getPublishedEventsMock,
}));

import { useEventSessions } from "./use-event-sessions";

function makeEvent(overrides: Partial<VerzelEvent> = {}): VerzelEvent {
	return {
		id: "event-1",
		tmdbMovieId: 42,
		movieTitle: "Movie",
		moviePosterPath: null,
		sessionAt: "2026-08-19T20:00:00.000Z",
		venueName: "Cinema A",
		venueAddress: "Rua A, 1",
		priceCents: 1000,
		roomId: "room-1",
		rows: 5,
		columns: 5,
		status: "published",
		...overrides,
	} as VerzelEvent;
}

describe("useEventSessions", () => {
	beforeEach(() => {
		getPublishedEventsMock.mockReset();
		navigateMock.mockReset();
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date("2026-08-19T10:00:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("returns empty data when there is no event", () => {
		const { result } = renderHook(() => useEventSessions(null));

		expect(result.current.cinemas).toEqual([]);
		expect(result.current.dates).toEqual([]);
		expect(result.current.times).toEqual([]);
	});

	it("derives the cinema for the current event even with a single session", async () => {
		const event = makeEvent();
		getPublishedEventsMock.mockResolvedValue([event]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() => expect(getPublishedEventsMock).toHaveBeenCalled());
		await waitFor(() => expect(result.current.cinemas).toEqual(["Cinema A"]));
		expect(result.current.times).toEqual([
			{ id: event.id, date: new Date(event.sessionAt), roomName: null },
		]);
	});

	it("lists the other cinemas for the same movie", async () => {
		const event = makeEvent();
		const otherVenue = makeEvent({ id: "event-2", venueName: "Cinema B" });
		getPublishedEventsMock.mockResolvedValue([event, otherVenue]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() =>
			expect(result.current.cinemas).toEqual(["Cinema A", "Cinema B"]),
		);
	});

	it("navigates to the first session of the selected cinema", async () => {
		const event = makeEvent();
		const otherVenue = makeEvent({
			id: "event-2",
			venueName: "Cinema B",
			sessionAt: "2026-08-21T20:00:00.000Z",
		});
		getPublishedEventsMock.mockResolvedValue([event, otherVenue]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() =>
			expect(result.current.cinemas).toEqual(["Cinema A", "Cinema B"]),
		);

		result.current.onSelectCinema("Cinema B");

		expect(navigateMock).toHaveBeenCalledWith({
			to: "/events/$eventId",
			params: { eventId: "event-2" },
			replace: true,
		});
	});

	it("lists a date option for each session date at the same cinema", async () => {
		const event = makeEvent();
		const nextDay = makeEvent({
			id: "event-2",
			sessionAt: "2026-08-20T20:00:00.000Z",
		});
		getPublishedEventsMock.mockResolvedValue([event, nextDay]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() => expect(result.current.dates).toHaveLength(2));
	});

	it("navigates when selecting a different date", async () => {
		const event = makeEvent();
		const nextDay = makeEvent({
			id: "event-2",
			sessionAt: "2026-08-20T20:00:00.000Z",
		});
		getPublishedEventsMock.mockResolvedValue([event, nextDay]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() => expect(result.current.dates).toHaveLength(2));

		result.current.onSelectDate(new Date(nextDay.sessionAt).toDateString());

		expect(navigateMock).toHaveBeenCalledWith({
			to: "/events/$eventId",
			params: { eventId: "event-2" },
			replace: true,
		});
	});

	it("lists a time option for each session at the same cinema and date", async () => {
		const event = makeEvent({ sessionAt: "2026-08-19T14:20:00.000Z" });
		const laterSameDay = makeEvent({
			id: "event-2",
			sessionAt: "2026-08-19T21:00:00.000Z",
		});
		getPublishedEventsMock.mockResolvedValue([event, laterSameDay]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() => expect(result.current.times).toHaveLength(2));
	});

	it("navigates when selecting a different time", async () => {
		const event = makeEvent({ sessionAt: "2026-08-19T14:20:00.000Z" });
		const laterSameDay = makeEvent({
			id: "event-2",
			sessionAt: "2026-08-19T21:00:00.000Z",
		});
		getPublishedEventsMock.mockResolvedValue([event, laterSameDay]);

		const { result } = renderHook(() => useEventSessions(event));

		await waitFor(() => expect(result.current.times).toHaveLength(2));

		result.current.onSelectTime("event-2");

		expect(navigateMock).toHaveBeenCalledWith({
			to: "/events/$eventId",
			params: { eventId: "event-2" },
			replace: true,
		});
	});
});
