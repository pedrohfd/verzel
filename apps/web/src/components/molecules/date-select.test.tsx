import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DateSelect from "./date-select";

describe("DateSelect", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-19T10:00:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("renders nothing when there are no dates", () => {
		const { container } = render(
			<DateSelect dates={[]} selectedDateKey="" onSelectDate={vi.fn()} />,
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders a pill for each date", () => {
		render(
			<DateSelect
				dates={[
					{ key: "2026-08-19", date: new Date("2026-08-19T20:00:00") },
					{ key: "2026-08-20", date: new Date("2026-08-20T20:00:00") },
				]}
				selectedDateKey="2026-08-19"
				onSelectDate={vi.fn()}
			/>,
		);

		expect(screen.getByText("HOJE")).toBeInTheDocument();
		expect(screen.getByText("AMANHÃ")).toBeInTheDocument();
	});

	it("calls onSelectDate when a different date pill is clicked", () => {
		const onSelectDate = vi.fn();
		render(
			<DateSelect
				dates={[
					{ key: "2026-08-19", date: new Date("2026-08-19T20:00:00") },
					{ key: "2026-08-20", date: new Date("2026-08-20T20:00:00") },
				]}
				selectedDateKey="2026-08-19"
				onSelectDate={onSelectDate}
			/>,
		);

		fireEvent.click(screen.getByLabelText("AMANHÃ 20/08"));

		expect(onSelectDate).toHaveBeenCalledWith("2026-08-20");
	});
});
