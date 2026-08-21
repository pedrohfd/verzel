import fastifyCors from "@fastify/cors";
import { env } from "@verzel/env/server";
import Fastify from "fastify";

import { authRoutes } from "./routes/auth";
import { checkinRoutes } from "./routes/checkin";
import { eventRoutes } from "./routes/events";
import { movieRoutes } from "./routes/movies";
import { paymentRoutes } from "./routes/payments";
import { reservationRoutes } from "./routes/reservations";
import { ticketRoutes } from "./routes/tickets";

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
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
	maxAge: 86400,
};

const fastify = Fastify({
	logger: true,
});

fastify.register(fastifyCors, baseCorsConfig);

fastify.register(authRoutes, { prefix: "/api/auth" });
fastify.register(movieRoutes, { prefix: "/api/movies" });
fastify.register(eventRoutes, { prefix: "/api/events" });
fastify.register(reservationRoutes, { prefix: "/api/reservations" });
fastify.register(paymentRoutes, { prefix: "/api/payments" });
fastify.register(ticketRoutes, { prefix: "/api/tickets" });
fastify.register(checkinRoutes, { prefix: "/api/checkin" });

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
