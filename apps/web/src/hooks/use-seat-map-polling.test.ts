import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getEventSeats } from "@/api/requests/events/get-event-seats";
import type { Seat } from "@/api/types";
import { useSeatMapPolling } from "./use-seat-map-polling";

vi.mock("@/api/requests/events/get-event-seats", () => ({
	getEventSeats: vi.fn(),
}));

const mockedGetEventSeats = vi.mocked(getEventSeats);

const seat = (status: Seat["status"]): Seat => ({
	eventId: "event-1",
	row: 0,
	column: 0,
	label: "A1",
	status,
});

beforeEach(() => {
	vi.useFakeTimers();
	mockedGetEventSeats.mockReset();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useSeatMapPolling", () => {
	it("does not fetch before the interval elapses", () => {
		mockedGetEventSeats.mockResolvedValue([seat("available")]);

		const { result } = renderHook(() =>
			useSeatMapPolling("event-1", true, 4000),
		);

		expect(result.current).toBeNull();
		expect(mockedGetEventSeats).not.toHaveBeenCalled();
	});

	it("fetches on every interval tick while enabled", async () => {
		mockedGetEventSeats.mockResolvedValue([seat("taken")]);

		const { result } = renderHook(() =>
			useSeatMapPolling("event-1", true, 4000),
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(4000);
		});
		expect(mockedGetEventSeats).toHaveBeenCalledTimes(1);
		expect(result.current).toEqual([seat("taken")]);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(4000);
		});
		expect(mockedGetEventSeats).toHaveBeenCalledTimes(2);
	});

	it("stops fetching once disabled", async () => {
		mockedGetEventSeats.mockResolvedValue([seat("available")]);

		const { rerender } = renderHook(
			({ enabled }) => useSeatMapPolling("event-1", enabled, 4000),
			{ initialProps: { enabled: true } },
		);

		rerender({ enabled: false });

		await act(async () => {
			await vi.advanceTimersByTimeAsync(4000);
		});
		expect(mockedGetEventSeats).not.toHaveBeenCalled();
	});

	it("ignores fetch errors and keeps the previous state", async () => {
		mockedGetEventSeats.mockRejectedValue(new Error("network error"));

		const { result } = renderHook(() =>
			useSeatMapPolling("event-1", true, 4000),
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(4000);
		});

		expect(result.current).toBeNull();
	});
});
