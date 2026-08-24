import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TimeSelect from "./time-select";

describe("TimeSelect", () => {
	it("renders nothing when there are no times", () => {
		const { container } = render(
			<TimeSelect times={[]} selectedTimeId="" onSelectTime={vi.fn()} />,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("shows a time pill with the room for every session, including a single one", () => {
		const { rerender } = render(
			<TimeSelect
				times={[
					{
						id: "event-1",
						date: new Date("2026-08-19T14:20:00"),
						roomName: "Sala 2",
					},
				]}
				selectedTimeId="event-1"
				onSelectTime={vi.fn()}
			/>,
		);

		expect(screen.getByText("14:20 · Sala 2")).toBeInTheDocument();

		rerender(
			<TimeSelect
				times={[
					{
						id: "event-1",
						date: new Date("2026-08-19T14:20:00"),
						roomName: "Sala 2",
					},
					{
						id: "event-2",
						date: new Date("2026-08-19T21:00:00"),
						roomName: "Sala 1",
					},
				]}
				selectedTimeId="event-1"
				onSelectTime={vi.fn()}
			/>,
		);

		expect(screen.getByText("14:20 · Sala 2")).toBeInTheDocument();
		expect(screen.getByText("21:00 · Sala 1")).toBeInTheDocument();
	});

	it("shows only the time when the session has no room", () => {
		render(
			<TimeSelect
				times={[
					{
						id: "event-1",
						date: new Date("2026-08-19T14:20:00"),
						roomName: null,
					},
				]}
				selectedTimeId="event-1"
				onSelectTime={vi.fn()}
			/>,
		);

		expect(screen.getByText("14:20")).toBeInTheDocument();
	});

	it("calls onSelectTime when a different time pill is clicked", () => {
		const onSelectTime = vi.fn();
		render(
			<TimeSelect
				times={[
					{
						id: "event-1",
						date: new Date("2026-08-19T14:20:00"),
						roomName: "Sala 2",
					},
					{
						id: "event-2",
						date: new Date("2026-08-19T21:00:00"),
						roomName: "Sala 1",
					},
				]}
				selectedTimeId="event-1"
				onSelectTime={onSelectTime}
			/>,
		);

		fireEvent.click(screen.getByText("21:00 · Sala 1"));

		expect(onSelectTime).toHaveBeenCalledWith("event-2");
	});
});
