import { db } from "@verzel/db";
import { sql } from "drizzle-orm";

const TABLES = [
	"payment_combo_item",
	"payment",
	"ticket",
	"reservation",
	"seat",
	"event",
	"combo",
	"cinema_room",
	"session",
	"account",
	"verification",
	"user",
];

export async function resetTestData() {
	await db.execute(
		sql.raw(
			`TRUNCATE TABLE ${TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
		),
	);
}
