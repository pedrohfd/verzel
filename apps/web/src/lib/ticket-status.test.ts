import { describe, expect, it } from "vitest";

import {
	cancellationReasonLabel,
	ticketStatusBadge,
	ticketStatusOptions,
} from "./ticket-status";

describe("ticketStatusBadge", () => {
	it("labels every status in Portuguese", () => {
		expect(ticketStatusBadge("valid").label).toBe("Válido");
		expect(ticketStatusBadge("used").label).toBe("Utilizado");
		expect(ticketStatusBadge("cancelled").label).toBe("Cancelado");
		expect(ticketStatusBadge("expired").label).toBe("Expirado");
	});
});

describe("ticketStatusOptions", () => {
	it("offers a filter option for every status, including expired", () => {
		expect(ticketStatusOptions.map((option) => option.value)).toEqual([
			"valid",
			"used",
			"cancelled",
			"expired",
		]);
	});
});

describe("cancellationReasonLabel", () => {
	it("explains who cancelled the ticket", () => {
		expect(cancellationReasonLabel("customer_cancelled")).toBe(
			"Cancelado por você",
		);
		expect(cancellationReasonLabel("event_cancelled")).toBe("Sessão cancelada");
	});
});
