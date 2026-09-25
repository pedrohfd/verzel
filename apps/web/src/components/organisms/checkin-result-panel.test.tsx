import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CheckinResultPanel from "./checkin-result-panel";

describe("CheckinResultPanel", () => {
	it("says it is too early and when validation opens", () => {
		const opensAt = new Date(2026, 8, 25, 19, 30);

		render(
			<CheckinResultPanel
				result={{ result: "too_early", opensAt: opensAt.toISOString() }}
				onScanNext={vi.fn()}
			/>,
		);

		expect(screen.getByText("Cedo demais")).toBeInTheDocument();
		expect(
			screen.getByText("A validação abre em 25/09/2026, 19:30"),
		).toBeInTheDocument();
	});

	it("shows who validated an already used ticket", () => {
		render(
			<CheckinResultPanel
				result={{
					result: "already_used",
					checkedInAt: new Date(2026, 8, 25, 19, 45).toISOString(),
					checkedInBy: "Ana",
				}}
				onScanNext={vi.fn()}
			/>,
		);

		expect(screen.getByText("Ingresso já utilizado")).toBeInTheDocument();
		expect(screen.getByText(/por Ana/)).toBeInTheDocument();
	});

	it("lets the staff scan the next ticket", () => {
		const onScanNext = vi.fn();
		render(
			<CheckinResultPanel
				result={{ result: "invalid" }}
				onScanNext={onScanNext}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Escanear próximo" }));

		expect(onScanNext).toHaveBeenCalled();
	});
});
