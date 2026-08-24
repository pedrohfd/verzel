import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SessionTimePicker from "./session-time-picker";

function dayButtonName(day: number) {
	return new RegExp(`\\b${day} de `);
}

describe("SessionTimePicker", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date(2026, 7, 15, 14, 30));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("keeps the hour and minute selects disabled until a date is chosen", () => {
		render(
			<SessionTimePicker
				value=""
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		expect(screen.getByText("Hora").closest("button")).toBeDisabled();
		expect(screen.getByText("Min").closest("button")).toBeDisabled();
	});

	it("keeps the hour and minute selects disabled while the schedule is loading", () => {
		render(
			<SessionTimePicker
				value="2026-08-19T09:00"
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
				loading
			/>,
		);

		expect(screen.getByText("09").closest("button")).toBeDisabled();
		expect(screen.getByText("00").closest("button")).toBeDisabled();
	});

	it("disables hours that conflict with an occupied slot", async () => {
		render(
			<SessionTimePicker
				value="2026-08-19T09:00"
				onChange={vi.fn()}
				occupiedSlots={[
					{ sessionAt: "2026-08-19T14:00:00", durationMinutes: 120 },
				]}
				durationMinutes={120}
			/>,
		);

		const [hourCombobox] = screen.getAllByRole("combobox");
		fireEvent.click(hourCombobox);

		const occupiedOption = await screen.findByRole("option", {
			name: "14 (ocupado)",
		});
		expect(occupiedOption).toHaveAttribute("aria-disabled", "true");

		const freeOption = screen.getByRole("option", { name: "10" });
		expect(freeOption).not.toHaveAttribute("aria-disabled", "true");
	});

	it("disables minutes that conflict with an occupied slot", async () => {
		render(
			<SessionTimePicker
				value="2026-08-19T14:00"
				onChange={vi.fn()}
				occupiedSlots={[
					{ sessionAt: "2026-08-19T14:00:00", durationMinutes: 120 },
				]}
				durationMinutes={120}
			/>,
		);

		const [, minuteCombobox] = screen.getAllByRole("combobox");
		fireEvent.click(minuteCombobox);

		const occupiedOption = await screen.findByRole("option", {
			name: "00 (ocupado)",
		});
		expect(occupiedOption).toHaveAttribute("aria-disabled", "true");
	});

	it("shows a placeholder until a date is chosen, then picks a date from the calendar", async () => {
		const onChange = vi.fn();
		const { rerender } = render(
			<SessionTimePicker
				value=""
				onChange={onChange}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		expect(screen.getByText("Selecionar data")).toBeInTheDocument();

		fireEvent.click(screen.getByText("Selecionar data"));

		const day19 = await screen.findByRole("button", {
			name: dayButtonName(19),
		});
		fireEvent.click(day19);

		expect(onChange).toHaveBeenCalledWith(
			expect.stringMatching(/^\d{4}-\d{2}-19T$/),
		);

		rerender(
			<SessionTimePicker
				value="2026-08-19T"
				onChange={onChange}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		expect(screen.getByText(/19 de agosto de 2026/i)).toBeInTheDocument();
		expect(screen.getByText("Hora").closest("button")).not.toBeDisabled();
	});

	it("combines the picked date with the existing time into a single onChange value", async () => {
		const onChange = vi.fn();
		render(
			<SessionTimePicker
				value="2026-08-19T10:00"
				onChange={onChange}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		fireEvent.click(screen.getByText(/19 de agosto de 2026/i));

		const day20 = await screen.findByRole("button", {
			name: dayButtonName(20),
		});
		fireEvent.click(day20);

		expect(onChange).toHaveBeenCalledWith("2026-08-20T10:00");
	});

	it("combines the selected hour and minute into a single onChange value", async () => {
		const onChange = vi.fn();
		render(
			<SessionTimePicker
				value="2026-08-19T10:00"
				onChange={onChange}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		const [, minuteCombobox] = screen.getAllByRole("combobox");
		fireEvent.click(minuteCombobox);

		const option = await screen.findByRole("option", { name: "05" });
		fireEvent.pointerDown(option, { pointerType: "mouse" });
		fireEvent.click(option);

		expect(onChange).toHaveBeenCalledWith("2026-08-19T10:05");
	});

	it("injects an hour outside the grid as an extra, enabled option", async () => {
		render(
			<SessionTimePicker
				value="2026-08-19T10:37"
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		const [hourCombobox, minuteCombobox] = screen.getAllByRole("combobox");

		fireEvent.click(hourCombobox);
		const extraHour = await screen.findByRole("option", { name: "10" });
		expect(extraHour).not.toHaveAttribute("aria-disabled", "true");
		fireEvent.pointerDown(extraHour, { pointerType: "mouse" });
		fireEvent.click(extraHour);

		fireEvent.click(minuteCombobox);
		const extraMinute = await screen.findByRole("option", { name: "37" });
		expect(extraMinute).not.toHaveAttribute("aria-disabled", "true");
	});

	it("disables past days in the calendar", async () => {
		render(
			<SessionTimePicker
				value=""
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		fireEvent.click(screen.getByText("Selecionar data"));

		const day10 = await screen.findByRole("button", {
			name: dayButtonName(10),
		});
		expect(day10).toBeDisabled();

		const day20 = await screen.findByRole("button", {
			name: dayButtonName(20),
		});
		expect(day20).not.toBeDisabled();
	});

	it("disables hours that already passed when the selected date is today", async () => {
		render(
			<SessionTimePicker
				value="2026-08-15T09:00"
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		const [hourCombobox] = screen.getAllByRole("combobox");
		fireEvent.click(hourCombobox);

		const pastHour = await screen.findByRole("option", {
			name: "10 (passado)",
		});
		expect(pastHour).toHaveAttribute("aria-disabled", "true");

		const futureHour = screen.getByRole("option", { name: "15" });
		expect(futureHour).not.toHaveAttribute("aria-disabled", "true");
	});

	it("does not disable past hours for a future date", async () => {
		render(
			<SessionTimePicker
				value="2026-08-20T09:00"
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		const [hourCombobox] = screen.getAllByRole("combobox");
		fireEvent.click(hourCombobox);

		const hour = await screen.findByRole("option", { name: "10" });
		expect(hour).not.toHaveAttribute("aria-disabled", "true");
	});

	it("disables minutes that already passed within the current hour", async () => {
		render(
			<SessionTimePicker
				value="2026-08-15T14:00"
				onChange={vi.fn()}
				occupiedSlots={[]}
				durationMinutes={120}
			/>,
		);

		const [, minuteCombobox] = screen.getAllByRole("combobox");
		fireEvent.click(minuteCombobox);

		const pastMinute = await screen.findByRole("option", {
			name: "00 (passado)",
		});
		expect(pastMinute).toHaveAttribute("aria-disabled", "true");

		const futureMinute = screen.getByRole("option", { name: "35" });
		expect(futureMinute).not.toHaveAttribute("aria-disabled", "true");
	});
});
