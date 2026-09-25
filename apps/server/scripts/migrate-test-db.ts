import { fileURLToPath } from "node:url";
import { config } from "dotenv";

config({ path: fileURLToPath(new URL("../.env.test", import.meta.url)) });

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const testDatabaseUrl = process.env.DATABASE_URL;
if (!testDatabaseUrl) {
	throw new Error("DATABASE_URL is not set (expected from .env.test)");
}

const testDbName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");
const adminUrl = testDatabaseUrl.replace(`/${testDbName}`, "/postgres");

const adminPool = new Pool({ connectionString: adminUrl });
try {
	await adminPool.query(`CREATE DATABASE ${testDbName}`);
} catch (error) {
	if (!(error instanceof Error) || !error.message.includes("already exists")) {
		throw error;
	}
} finally {
	await adminPool.end();
}

const testPool = new Pool({ connectionString: testDatabaseUrl });
const db = drizzle(testPool);
await migrate(db, {
	migrationsFolder: fileURLToPath(
		new URL("../../../packages/db/src/migrations", import.meta.url),
	),
});
await testPool.end();
