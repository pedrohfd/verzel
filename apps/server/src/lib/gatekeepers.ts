import { auth } from "@verzel/auth";
import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";

import { EmailAlreadyInUseError } from "./errors";

export interface RegisterGatekeeperInput {
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
		.set({ role: "portaria" })
		.where(eq(schema.user.id, userId))
		.returning();

	return gatekeeper;
}
