import fastifyCors from "@fastify/cors";
import Fastify from "fastify";

import { authRoutes } from "./routes/auth";
import { checkinRoutes } from "./routes/checkin";
import { cinemaRoutes } from "./routes/cinemas";
import { comboRoutes } from "./routes/combos";
import { eventRoutes } from "./routes/events";
import { gatekeeperRoutes } from "./routes/gatekeepers";
import { movieRoutes } from "./routes/movies";
import { paymentRoutes } from "./routes/payments";
import { reservationRoutes } from "./routes/reservations";
import { roomRoutes } from "./routes/rooms";
import { ticketRoutes } from "./routes/tickets";
import { userRoutes } from "./routes/users";

type CorsConfig = Parameters<typeof fastifyCors>[1];

export function buildApp(corsConfig: CorsConfig, { logger = true } = {}) {
	const fastify = Fastify({
		logger,
	});

	fastify.register(fastifyCors, corsConfig);

	fastify.register(authRoutes, { prefix: "/api/auth" });
	fastify.register(movieRoutes, { prefix: "/api/movies" });
	fastify.register(eventRoutes, { prefix: "/api/events" });
	fastify.register(reservationRoutes, { prefix: "/api/reservations" });
	fastify.register(paymentRoutes, { prefix: "/api/payments" });
	fastify.register(ticketRoutes, { prefix: "/api/tickets" });
	fastify.register(checkinRoutes, { prefix: "/api/checkin" });
	fastify.register(cinemaRoutes, { prefix: "/api/cinemas" });
	fastify.register(roomRoutes, { prefix: "/api/rooms" });
	fastify.register(comboRoutes, { prefix: "/api/combos" });
	fastify.register(gatekeeperRoutes, { prefix: "/api/gatekeepers" });
	fastify.register(userRoutes, { prefix: "/api/users" });

	return fastify;
}
