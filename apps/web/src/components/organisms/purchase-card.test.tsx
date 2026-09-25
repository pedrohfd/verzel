import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MyPurchase, PurchaseTicket } from "@/api/types";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

const { default: PurchaseCard } = await import("./purchase-card");

function normalize(text: string | null) {
	return (text ?? "").replace(/\s/g, " ");
}

function ticket(overrides: Partial<PurchaseTicket>): PurchaseTicket {
	return {
		id: "ticket-1",
		reservationId: "reservation-1",
		eventId: "event-1",
		seatId: "seat-1",
		purchaseId: "purchase-1",
		priceCents: 2000,
		shareToken: "token",
		signature: "sig",
		issuedAt: "2026-01-01T00:00:00.000Z",
		checkedInAt: null,
		checkedInByUserId: null,
		cancelledAt: null,
		cancellationReason: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		status: "valid",
		seat: { row: 0, column: 0, label: "A1" },
		...overrides,
	};
}

function purchase(overrides: Partial<MyPurchase> = {}): MyPurchase {
	return {
		id: "purchase-1",
		customerId: "customer-1",
		eventId: "event-1",
		amountCents: 7000,
		method: "simulated_card",
		processedAt: "2026-01-01T00:00:00.000Z",
		createdAt: "2026-01-01T00:00:00.000Z",
		event: {
			id: "event-1",
			organizerId: "organizer-1",
			tmdbMovieId: 1,
			movieTitle: "Duna",
			moviePosterPath: null,
			movieBackdropPath: null,
			sessionAt: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
			venueName: "Cine Centro",
			venueAddress: "Rua A",
			priceCents: 2000,
			roomId: null,
			rows: 5,
			columns: 5,
			status: "published",
			createdAt: "2026-01-01T00:00:00.000Z",
			updatedAt: "2026-01-01T00:00:00.000Z",
		},
		comboItems: [
			{
				id: "item-1",
				purchaseId: "purchase-1",
				comboId: "combo-1",
				comboName: "Pipoca",
				comboDescription: "Pipoca salgada 500g",
				unitPriceCents: 1500,
				quantity: 2,
			},
		],
		refunds: [],
		refundedCents: 0,
		tickets: [
			ticket({ id: "ticket-1", seat: { row: 0, column: 0, label: "A1" } }),
			ticket({ id: "ticket-2", seat: { row: 0, column: 1, label: "A2" } }),
		],
		...overrides,
	};
}

describe("PurchaseCard", () => {
	it("shows the session, the combos and the amount paid", () => {
		render(<PurchaseCard purchase={purchase()} onCancelTicket={vi.fn()} />);

		expect(screen.getByText("Duna")).toBeInTheDocument();
		expect(screen.getByText("2x Pipoca")).toBeInTheDocument();
		expect(normalize(screen.getByText(/Pago/).textContent)).toContain(
			"Pago: R$ 70,00",
		);
		expect(screen.queryByText(/Reembolsado/)).not.toBeInTheDocument();
	});

	it("shows each combo as it was sold, even if it no longer exists", () => {
		render(
			<PurchaseCard
				purchase={purchase({
					comboItems: [
						{
							id: "item-1",
							purchaseId: "purchase-1",
							comboId: null,
							comboName: "Pipoca",
							comboDescription: "Pipoca salgada 500g",
							unitPriceCents: 1500,
							quantity: 2,
						},
					],
				})}
				onCancelTicket={vi.fn()}
			/>,
		);

		expect(screen.getByText("2x Pipoca")).toBeInTheDocument();
		expect(screen.getByText(/Pipoca salgada 500g/)).toBeInTheDocument();
		expect(normalize(screen.getByText(/cada/).textContent)).toContain(
			"R$ 15,00 cada",
		);
	});

	it("shows the refunded total and why each cancelled ticket was cancelled", () => {
		render(
			<PurchaseCard
				purchase={purchase({
					refundedCents: 2000,
					tickets: [
						ticket({
							id: "ticket-1",
							status: "cancelled",
							cancelledAt: "2026-01-02T00:00:00.000Z",
							cancellationReason: "customer_cancelled",
							seat: { row: 0, column: 0, label: "A1" },
						}),
						ticket({
							id: "ticket-2",
							status: "cancelled",
							cancelledAt: "2026-01-02T00:00:00.000Z",
							cancellationReason: "event_cancelled",
							seat: { row: 0, column: 1, label: "A2" },
						}),
					],
				})}
				onCancelTicket={vi.fn()}
			/>,
		);

		expect(normalize(screen.getByText(/Reembolsado/).textContent)).toContain(
			"Reembolsado: R$ 20,00",
		);
		const [first, second] = screen.getAllByTestId("purchase-ticket");
		expect(
			within(first as HTMLElement).getByText("Cancelado por você"),
		).toBeInTheDocument();
		expect(
			within(second as HTMLElement).getByText("Sessão cancelada"),
		).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
	});

	it("offers cancellation only for valid tickets of sessions that have not started", () => {
		render(
			<PurchaseCard
				purchase={purchase({
					tickets: [
						ticket({ id: "ticket-1", status: "valid" }),
						ticket({
							id: "ticket-2",
							status: "used",
							checkedInAt: "2026-01-02T00:00:00.000Z",
							seat: { row: 0, column: 1, label: "A2" },
						}),
					],
				})}
				onCancelTicket={vi.fn()}
			/>,
		);

		expect(screen.getAllByRole("button", { name: "Cancelar" })).toHaveLength(1);
	});

	it("asks for confirmation before cancelling a ticket", async () => {
		const onCancelTicket = vi.fn();
		render(
			<PurchaseCard
				purchase={purchase({ tickets: [ticket({ id: "ticket-1" })] })}
				onCancelTicket={onCancelTicket}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		fireEvent.click(
			await screen.findByRole("button", { name: "Cancelar ingresso" }),
		);

		expect(onCancelTicket).toHaveBeenCalledWith("ticket-1");
	});
});
