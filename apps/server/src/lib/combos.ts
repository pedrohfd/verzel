import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";

import {
	DuplicateComboNameError,
	ForbiddenError,
	NotFoundError,
} from "./errors";

export interface CreateComboInput {
	organizerId: string;
	name: string;
	description: string | null;
	priceCents: number;
	active: boolean;
}

async function assertNoDuplicateName(
	organizerId: string,
	name: string,
	excludeComboId?: string,
) {
	const existing = await db.query.combos.findFirst({
		where: and(
			eq(schema.combos.organizerId, organizerId),
			eq(schema.combos.name, name),
			excludeComboId ? ne(schema.combos.id, excludeComboId) : undefined,
		),
	});
	if (existing) throw new DuplicateComboNameError();
}

export async function createCombo(input: CreateComboInput) {
	await assertNoDuplicateName(input.organizerId, input.name);
	return db.insert(schema.combos).values(input).returning();
}

export function listOrganizerCombos(organizerId: string) {
	return db.query.combos.findMany({
		where: eq(schema.combos.organizerId, organizerId),
		orderBy: asc(schema.combos.createdAt),
	});
}

export async function getOwnedCombo(comboId: string, organizerId: string) {
	const combo = await db.query.combos.findFirst({
		where: eq(schema.combos.id, comboId),
	});
	if (!combo) throw new NotFoundError("Combo");
	if (combo.organizerId !== organizerId) throw new ForbiddenError();
	return combo;
}

export interface UpdateComboInput {
	name: string;
	description: string | null;
	priceCents: number;
	active: boolean;
}

export async function updateCombo(
	comboId: string,
	organizerId: string,
	patch: UpdateComboInput,
) {
	await assertNoDuplicateName(organizerId, patch.name, comboId);
	const [combo] = await db
		.update(schema.combos)
		.set(patch)
		.where(eq(schema.combos.id, comboId))
		.returning();
	return combo;
}

export async function deleteCombo(comboId: string) {
	await db.delete(schema.combos).where(eq(schema.combos.id, comboId));
}

export async function listActiveCombosForEvent(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(schema.events.id, eventId),
	});
	if (!event) throw new NotFoundError("Event");

	return db.query.combos.findMany({
		where: and(
			eq(schema.combos.organizerId, event.organizerId),
			eq(schema.combos.active, true),
		),
		orderBy: asc(schema.combos.createdAt),
	});
}
