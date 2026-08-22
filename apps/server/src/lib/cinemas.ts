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

export async function getCinemaByUserId(userId: string) {
	const [user] = await db
		.select({
			cinemaName: schema.user.cinemaName,
			street: schema.user.street,
			number: schema.user.number,
			complement: schema.user.complement,
			neighborhood: schema.user.neighborhood,
			city: schema.user.city,
			state: schema.user.state,
		})
		.from(schema.user)
		.where(eq(schema.user.id, userId));

	return user;
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
