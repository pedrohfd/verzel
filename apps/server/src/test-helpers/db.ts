import { db } from "@verzel/db";
import { sql } from "drizzle-orm";

const TABLES = [
	"payment",
	"ticket",
	"reservation",
	"seat",
	"event",
	"session",
	"account",
	"verification",
	"user",
];

export async function resetTestData() {
	await db.execute(
		sql.raw(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`),
	);
}
