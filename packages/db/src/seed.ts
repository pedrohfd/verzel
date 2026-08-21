import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });

async function main() {
	const [email, role] = process.argv.slice(2);

	const { eq } = await import("drizzle-orm");
	const { createDb } = await import("./index");
	const { user, userRoleEnum } = await import("./schema");
	type Role = (typeof userRoleEnum.enumValues)[number];

	if (!email || !role) {
		console.error(
			"Usage: bun run db:seed <email> <cliente|organizador|portaria>",
		);
		process.exit(1);
	}

	if (!userRoleEnum.enumValues.includes(role as Role)) {
		console.error(
			`Invalid role "${role}". Expected one of: ${userRoleEnum.enumValues.join(", ")}`,
		);
		process.exit(1);
	}

	const db = createDb();
	const [updated] = await db
		.update(user)
		.set({ role: role as Role })
		.where(eq(user.email, email))
		.returning();

	if (!updated) {
		console.error(
			`No user found with email "${email}". Sign up normally first, then run this script.`,
		);
		process.exit(1);
	}

	console.log(`${updated.email} is now "${updated.role}".`);
	process.exit(0);
}

main();
