import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import HoldCountdown from "./hold-countdown";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2030-01-01T20:00:00Z"));
});

afterEach(() => {
	vi.useRealTimers();
});

describe("HoldCountdown", () => {
	it("shows how long the reservation still lasts", () => {
		render(<HoldCountdown expiresAt="2030-01-01T20:04:05Z" />);

		expect(
			screen.getByText("Seus assentos ficam reservados por mais 4:05"),
		).toBeInTheDocument();
	});

	it("counts down as time passes", () => {
		render(<HoldCountdown expiresAt="2030-01-01T20:04:05Z" />);

		act(() => {
			vi.advanceTimersByTime(65_000);
		});

		expect(
			screen.getByText("Seus assentos ficam reservados por mais 3:00"),
		).toBeInTheDocument();
	});

	it("tells the customer when the reservation has expired", () => {
		const onExpire = vi.fn();
		render(
			<HoldCountdown expiresAt="2030-01-01T20:00:02Z" onExpire={onExpire} />,
		);

		act(() => {
			vi.advanceTimersByTime(3_000);
		});

		expect(screen.getByText("Sua reserva expirou.")).toBeInTheDocument();
		expect(onExpire).toHaveBeenCalledTimes(1);
	});
});
