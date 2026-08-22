import { createDb } from "@verzel/db";
import * as schema from "@verzel/db/schema/auth";
import { env } from "@verzel/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
	const db = createDb();

	// On Vercel, VERCEL_PROJECT_PRODUCTION_URL (used to derive CORS_ORIGIN) only
	// matches requests to the production alias. Requests hitting a deployment's
	// own generated URL (VERCEL_URL) need to be trusted too, or the origin check
	// rejects them with INVALID_ORIGIN.
	const deploymentOrigin = process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}`
		: undefined;

	const isProduction = env.BETTER_AUTH_URL.startsWith("https://");

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [env.CORS_ORIGIN, deploymentOrigin].filter(
			(origin) => origin !== undefined,
		),
		emailAndPassword: {
			enabled: true,
		},
		user: {
			additionalFields: {
				role: {
					type: "string",
					defaultValue: "cliente",
					input: false,
				},
				cinemaName: {
					type: "string",
					required: false,
					input: false,
				},
				street: {
					type: "string",
					required: false,
					input: false,
				},
				number: {
					type: "string",
					required: false,
					input: false,
				},
				complement: {
					type: "string",
					required: false,
					input: false,
				},
				neighborhood: {
					type: "string",
					required: false,
					input: false,
				},
				city: {
					type: "string",
					required: false,
					input: false,
				},
				state: {
					type: "string",
					required: false,
					input: false,
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: isProduction ? "none" : "lax",
				secure: isProduction,
				httpOnly: true,
			},
		},
		plugins: [],
	});
}

export const auth = createAuth();
