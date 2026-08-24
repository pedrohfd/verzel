import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";
import { EmailAlreadyInUseError } from "./errors";

type Role = "cliente" | "organizador" | "portaria";

const profileColumns = {
	id: schema.user.id,
	name: schema.user.name,
	email: schema.user.email,
	role: schema.user.role,
	cinemaName: schema.user.cinemaName,
	cnpj: schema.user.cnpj,
	zipCode: schema.user.zipCode,
	street: schema.user.street,
	number: schema.user.number,
	complement: schema.user.complement,
	neighborhood: schema.user.neighborhood,
	city: schema.user.city,
	state: schema.user.state,
};

export interface UpdateProfileInput {
	name: string;
	email: string;
	cinemaName?: string;
	cnpj?: string;
	zipCode?: string;
	street?: string;
	number?: string;
	complement?: string;
	neighborhood?: string;
	city?: string;
	state?: string;
}

export async function getUserProfile(userId: string) {
	const [profile] = await db
		.select(profileColumns)
		.from(schema.user)
		.where(eq(schema.user.id, userId));

	return profile;
}

export async function updateUserProfile(
	userId: string,
	currentRole: Role,
	input: UpdateProfileInput,
) {
	const existing = await db.query.user.findFirst({
		where: eq(schema.user.email, input.email),
	});

	if (existing && existing.id !== userId) {
		throw new EmailAlreadyInUseError();
	}

	const values =
		currentRole === "organizador"
			? {
					name: input.name,
					email: input.email,
					cinemaName: input.cinemaName,
					cnpj: input.cnpj,
					zipCode: input.zipCode,
					street: input.street,
					number: input.number,
					complement: input.complement,
					neighborhood: input.neighborhood,
					city: input.city,
					state: input.state,
				}
			: { name: input.name, email: input.email };

	const [profile] = await db
		.update(schema.user)
		.set(values)
		.where(eq(schema.user.id, userId))
		.returning(profileColumns);

	return profile;
}
