import { auth } from "@verzel/auth";
import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { APIError } from "better-auth/api";
import { and, desc, eq } from "drizzle-orm";

import { EmailAlreadyInUseError, NotFoundError } from "./errors";

export interface RegisterGatekeeperInput {
	organizerId: string;
	name: string;
	email: string;
	password: string;
}

export async function registerGatekeeper(input: RegisterGatekeeperInput) {
	let userId: string;

	try {
		const result = await auth.api.signUpEmail({
			body: {
				name: input.name,
				email: input.email,
				password: input.password,
			},
		});
		userId = result.user.id;
	} catch (error) {
		if (error instanceof APIError) {
			throw new EmailAlreadyInUseError();
		}
		throw error;
	}

	const [gatekeeper] = await db
		.update(schema.user)
		.set({ role: "portaria", createdBy: input.organizerId })
		.where(eq(schema.user.id, userId))
		.returning();

	return gatekeeper;
}

export function listOrganizerGatekeepers(organizerId: string) {
	return db.query.user.findMany({
		where: and(
			eq(schema.user.role, "portaria"),
			eq(schema.user.createdBy, organizerId),
		),
		orderBy: desc(schema.user.createdAt),
		columns: { id: true, name: true, email: true, createdAt: true },
	});
}

export async function deleteGatekeeper(
	gatekeeperId: string,
	organizerId: string,
) {
	const gatekeeper = await db.query.user.findFirst({
		where: and(
			eq(schema.user.id, gatekeeperId),
			eq(schema.user.role, "portaria"),
			eq(schema.user.createdBy, organizerId),
		),
	});
	if (!gatekeeper) throw new NotFoundError("Gatekeeper");

	await db.delete(schema.user).where(eq(schema.user.id, gatekeeperId));
}
