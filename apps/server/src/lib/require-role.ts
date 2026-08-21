import { auth } from "@verzel/auth";
import type { FastifyReply, FastifyRequest } from "fastify";

type Role = "cliente" | "organizador" | "portaria";

declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; role: Role };
	}
}

function toHeaders(request: FastifyRequest): Headers {
	const headers = new Headers();
	for (const [key, value] of Object.entries(request.headers)) {
		if (value) headers.append(key, value.toString());
	}
	return headers;
}

export async function getSessionUser(request: FastifyRequest) {
	const session = await auth.api.getSession({ headers: toHeaders(request) });
	if (!session) return null;
	return session.user as unknown as { id: string; role: Role };
}

export function requireRole(...roles: Role[]) {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		const user = await getSessionUser(request);

		if (!user) {
			return reply
				.status(401)
				.send({ error: "Authentication required", code: "UNAUTHENTICATED" });
		}

		if (!roles.includes(user.role)) {
			return reply.status(403).send({
				error: "You do not have access to this resource",
				code: "FORBIDDEN",
			});
		}

		request.user = user;
	};
}
