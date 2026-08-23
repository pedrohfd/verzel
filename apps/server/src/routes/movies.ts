import type { FastifyInstance } from "fastify";

import {
	getMovieFullDetails,
	getMovieTrailers,
	getNowPlayingMoviesEnriched,
	getTrendingMovies,
	searchMovies,
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

	fastify.get<{ Querystring: { query?: string } }>(
		"/search",
		async (request, reply) => {
			const { query } = request.query;
			if (!query) {
				return { results: [] };
			}

			try {
				const { results } = await searchMovies(query);
				return { results };
			} catch (error) {
				const status = error instanceof TmdbError ? error.status : 502;
				fastify.log.error({ err: error }, "TMDB request failed:");
				reply.status(502).send({
					error: "Failed to search movies from TMDB",
					code: "TMDB_UPSTREAM_ERROR",
					upstreamStatus: status,
				});
			}
		},
	);

	fastify.get<{ Params: { id: string } }>(
		"/:id/trailer",
		async (request, reply) => {
			try {
				const trailers = await getMovieTrailers(Number(request.params.id));
				return { trailers };
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

	fastify.get<{ Params: { id: string } }>(
		"/:id/details",
		async (request, reply) => {
			try {
				return await getMovieFullDetails(Number(request.params.id));
			} catch (error) {
				const status = error instanceof TmdbError ? error.status : 502;
				fastify.log.error({ err: error }, "TMDB request failed:");
				reply.status(502).send({
					error: "Failed to fetch movie details from TMDB",
					code: "TMDB_UPSTREAM_ERROR",
					upstreamStatus: status,
				});
			}
		},
	);
}
