import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	buyTickets,
	createEvent,
	createGatekeeper,
	createOrganizer,
	createUser,
} from "../test-helpers/fixtures";
import {
	type CheckinStaff,
	listCheckinEvents,
	validateTicket,
} from "./checkin";
import { cancelTicket } from "./tickets";

beforeEach(async () => {
	await resetTestData();
});

async function setupCinema() {
	const organizer = await createOrganizer();
	const gatekeeper = await createGatekeeper(organizer.id);
	const event = await createEvent(organizer.id);
	return { organizer, gatekeeper, event };
}

async function issueTicket(eventId: string) {
	const customer = await createUser("cliente");
	const { tickets } = await buyTickets(eventId, customer.id);
	const ticket = tickets[0];
	if (!ticket) throw new Error("No ticket issued");
	return { customer, ticket };
}

function asStaff(user: CheckinStaff): CheckinStaff {
	return { id: user.id, role: user.role };
}

describe("listCheckinEvents", () => {
	it("lists only the published sessions of the organizer's own cinema", async () => {
		const { organizer, event } = await setupCinema();
		await createEvent(organizer.id, { status: "draft" });
		const other = await setupCinema();

		const events = await listCheckinEvents(asStaff(organizer));

		expect(events.map((e) => e.id)).toEqual([event.id]);
		expect(events.map((e) => e.id)).not.toContain(other.event.id);
	});

	it("lists the sessions of the cinema that created the gatekeeper", async () => {
		const { gatekeeper, event } = await setupCinema();
		await setupCinema();

		const events = await listCheckinEvents(asStaff(gatekeeper));

		expect(events.map((e) => e.id)).toEqual([event.id]);
	});
});

describe("validateTicket", () => {
	it("lets the organizer validate a ticket of their own cinema", async () => {
		const { organizer, event } = await setupCinema();
		const { customer, ticket } = await issueTicket(event.id);

		const result = await validateTicket(
			event.id,
			ticket.code,
			asStaff(organizer),
		);

		expect(result).toEqual({
			result: "valid",
			seatLabel: "A1",
			movieTitle: event.movieTitle,
			customerName: customer.name,
		});
		const stored = await db.query.tickets.findFirst({
			where: eq(schema.tickets.id, ticket.id),
		});
		expect(stored?.checkedInAt).not.toBeNull();
		expect(stored?.checkedInByUserId).toBe(organizer.id);
	});

	it("lets the gatekeeper validate a ticket of their cinema", async () => {
		const { gatekeeper, event } = await setupCinema();
		const { ticket } = await issueTicket(event.id);

		const result = await validateTicket(
			event.id,
			ticket.code,
			asStaff(gatekeeper),
		);

		expect(result.result).toBe("valid");
	});

	it("forbids the organizer from validating at another cinema's session", async () => {
		const { organizer } = await setupCinema();
		const other = await setupCinema();
		const { ticket } = await issueTicket(other.event.id);

		await expect(
			validateTicket(other.event.id, ticket.code, asStaff(organizer)),
		).rejects.toMatchObject({ code: "FORBIDDEN" });

		const stored = await db.query.tickets.findFirst({
			where: eq(schema.tickets.id, ticket.id),
		});
		expect(stored?.checkedInAt).toBeNull();
	});

	it("forbids the gatekeeper from validating at another cinema's session", async () => {
		const { gatekeeper } = await setupCinema();
		const other = await setupCinema();
		const { ticket } = await issueTicket(other.event.id);

		await expect(
			validateTicket(other.event.id, ticket.code, asStaff(gatekeeper)),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("returns invalid for a malformed code", async () => {
		const { organizer, event } = await setupCinema();

		await expect(
			validateTicket(event.id, "not-a-valid-code", asStaff(organizer)),
		).resolves.toEqual({ result: "invalid" });
	});

	it("returns wrong_event for a ticket of another session of the same cinema", async () => {
		const { organizer, event } = await setupCinema();
		const otherEvent = await createEvent(organizer.id);
		const { ticket } = await issueTicket(otherEvent.id);

		await expect(
			validateTicket(event.id, ticket.code, asStaff(organizer)),
		).resolves.toEqual({ result: "wrong_event", ticketEventId: otherEvent.id });
	});

	it("returns already_used on the second validation", async () => {
		const { organizer, gatekeeper, event } = await setupCinema();
		const { ticket } = await issueTicket(event.id);
		await validateTicket(event.id, ticket.code, asStaff(gatekeeper));

		const result = await validateTicket(
			event.id,
			ticket.code,
			asStaff(organizer),
		);

		expect(result).toMatchObject({
			result: "already_used",
			checkedInBy: gatekeeper.id,
		});
	});

	it("returns cancelled for a cancelled ticket", async () => {
		const { organizer, event } = await setupCinema();
		const { customer, ticket } = await issueTicket(event.id);
		await cancelTicket(ticket.id, customer.id);

		const result = await validateTicket(
			event.id,
			ticket.code,
			asStaff(organizer),
		);

		expect(result.result).toBe("cancelled");
	});
});
