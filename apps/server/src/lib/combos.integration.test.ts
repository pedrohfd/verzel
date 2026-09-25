import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import {
	buyTickets,
	createEvent,
	createOrganizer,
	createUser,
} from "../test-helpers/fixtures";
import { createCombo, deleteCombo, updateCombo } from "./combos";
import { listMyPurchases } from "./purchases";

beforeEach(async () => {
	await resetTestData();
});

async function sellCombo() {
	const organizer = await createOrganizer();
	const event = await createEvent(organizer.id);
	const customer = await createUser("cliente");
	const [combo] = await createCombo({
		organizerId: organizer.id,
		name: "Pipoca grande",
		description: "Pipoca salgada 500g",
		priceCents: 1500,
		active: true,
	});
	if (!combo) throw new Error("Combo was not created");
	await buyTickets(event.id, customer.id, 1, [
		{ comboId: combo.id, quantity: 2 },
	]);
	return { organizer, customer, combo };
}

const soldCombo = {
	comboName: "Pipoca grande",
	comboDescription: "Pipoca salgada 500g",
	unitPriceCents: 1500,
	quantity: 2,
};

describe("deleteCombo", () => {
	it("deletes a combo that was already sold, keeping it in past purchases", async () => {
		const { customer, combo } = await sellCombo();

		await deleteCombo(combo.id);

		expect(
			await db.query.combos.findFirst({
				where: eq(schema.combos.id, combo.id),
			}),
		).toBeUndefined();
		const [purchase] = await listMyPurchases(customer.id);
		expect(purchase?.comboItems).toMatchObject([
			{ ...soldCombo, comboId: null },
		]);
	});
});

describe("updateCombo", () => {
	it("does not change what past purchases show", async () => {
		const { organizer, customer, combo } = await sellCombo();

		await updateCombo(combo.id, organizer.id, {
			name: "Pipoca média",
			description: "Pipoca doce 300g",
			priceCents: 900,
			active: false,
		});

		const [purchase] = await listMyPurchases(customer.id);
		expect(purchase?.comboItems).toMatchObject([
			{ ...soldCombo, comboId: combo.id },
		]);
	});
});
