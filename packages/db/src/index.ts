import { env } from "@verzel/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export function createDb() {
	const pool = new Pool({
		connectionString: env.DATABASE_URL,
		ssl: env.DATABASE_URL.includes("sslmode=require")
			? { rejectUnauthorized: false }
			: undefined,
	});
	return drizzle(pool, { schema });
}

export const db = createDb();
