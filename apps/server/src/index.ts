import fastifyCors from "@fastify/cors";
import { auth } from "@verzel/auth";
import { env } from "@verzel/env/server";
import Fastify from "fastify";

import {
	getNowPlayingMoviesEnriched,
	getTrendingMovies,
	TmdbError,
} from "./lib/tmdb";

// On Vercel, VERCEL_PROJECT_PRODUCTION_URL (used to derive CORS_ORIGIN) only
// matches requests to the production alias. Requests hitting a deployment's
// own generated URL (VERCEL_URL) need to be trusted too, or the CORS check
// blocks them before they ever reach the auth handler.
const deploymentOrigin = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: undefined;

const baseCorsConfig = {
	origin: [env.CORS_ORIGIN, deploymentOrigin].filter(
		(origin) => origin !== undefined,
	),
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
	maxAge: 86400,
};

const fastify = Fastify({
	logger: true,
});

fastify.register(fastifyCors, baseCorsConfig);

fastify.route({
	method: ["GET", "POST"],
	url: "/api/auth/*",
	async handler(request, reply) {
		try {
			const url = new URL(request.url, `http://${request.headers.host}`);
			const headers = new Headers();
			Object.entries(request.headers).forEach(([key, value]) => {
				if (value) headers.append(key, value.toString());
			});
			const req = new Request(url.toString(), {
				method: request.method,
				headers,
				body: request.body ? JSON.stringify(request.body) : undefined,
			});
			const response = await auth.handler(req);
			reply.status(response.status);
			for (const [key, value] of response.headers) reply.header(key, value);
			reply.send(response.body ? await response.text() : null);
		} catch (error) {
			fastify.log.error({ err: error }, "Authentication Error:");
			reply.status(500).send({
				error: "Internal authentication error",
				code: "AUTH_FAILURE",
			});
		}
	},
});

fastify.get("/", async () => {
	return "OK";
});

fastify.get<{ Querystring: { window?: "day" | "week" } }>(
	"/api/movies/trending",
	async (request, reply) => {
		try {
			return await getTrendingMovies(request.query.window ?? "week");
		} catch (error) {
			const status = error instanceof TmdbError ? error.status : 502;
			fastify.log.error({ err: error }, "TMDB request failed:");
			reply.status(502).send({
				error: "Failed to fetch trending movies from TMDB",
				code: "TMDB_UPSTREAM_ERROR",
				upstreamStatus: status,
			});
		}
	},
);

fastify.get("/api/movies/home", async (_request, reply) => {
	try {
		const results = await getNowPlayingMoviesEnriched();
		return { results };
	} catch (error) {
		const status = error instanceof TmdbError ? error.status : 502;
		fastify.log.error({ err: error }, "TMDB request failed:");
		reply.status(502).send({
			error: "Failed to fetch home movies from TMDB",
			code: "TMDB_UPSTREAM_ERROR",
			upstreamStatus: status,
		});
	}
});

if (process.env.VERCEL) {
	// Vercel's Node.js Function runtime calls the default export directly
	// as a (req, res) handler; it doesn't call fastify.listen() for us.
	await fastify.ready();
} else {
	fastify.listen({ port: 3000 }, (err) => {
		if (err) {
			fastify.log.error(err);
			process.exit(1);
		}
		console.log("Server running on port 3000");
	});
}

export default async function handler(
	req: import("node:http").IncomingMessage,
	res: import("node:http").ServerResponse,
) {
	fastify.server.emit("request", req, res);
}
