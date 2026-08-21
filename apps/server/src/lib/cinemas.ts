import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";

export interface RegisterCinemaInput {
	cinemaName: string;
	cnpj: string;
	zipCode: string;
	street: string;
	number: string;
	complement?: string;
	neighborhood: string;
	city: string;
	state: string;
}

export async function registerCinema(
	userId: string,
	input: RegisterCinemaInput,
) {
	const [user] = await db
		.update(schema.user)
		.set({
			role: "organizador",
			cinemaName: input.cinemaName,
			cnpj: input.cnpj,
			zipCode: input.zipCode,
			street: input.street,
			number: input.number,
			complement: input.complement,
			neighborhood: input.neighborhood,
			city: input.city,
			state: input.state,
		})
		.where(eq(schema.user.id, userId))
		.returning();

	return user;
}
