import type { FastifyInstance } from "fastify";

import {
	getMovieTrailerKey,
	getNowPlayingMoviesEnriched,
	getTrendingMovies,
	TmdbError,
} from "../lib/tmdb";

export async function movieRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: { window?: "day" | "week" } }>(
		"/trending",
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

	fastify.get("/now-playing", async (_request, reply) => {
		try {
			const results = await getNowPlayingMoviesEnriched(19);
			return { results };
		} catch (error) {
			const status = error instanceof TmdbError ? error.status : 502;
			fastify.log.error({ err: error }, "TMDB request failed:");
			reply.status(502).send({
				error: "Failed to fetch now playing movies from TMDB",
				code: "TMDB_UPSTREAM_ERROR",
				upstreamStatus: status,
			});
		}
	});

	fastify.get<{ Params: { id: string } }>(
		"/:id/trailer",
		async (request, reply) => {
			try {
				const key = await getMovieTrailerKey(Number(request.params.id));
				return { key };
			} catch (error) {
				const status = error instanceof TmdbError ? error.status : 502;
				fastify.log.error({ err: error }, "TMDB request failed:");
				reply.status(502).send({
					error: "Failed to fetch movie trailer from TMDB",
					code: "TMDB_UPSTREAM_ERROR",
					upstreamStatus: status,
				});
			}
		},
	);
}
