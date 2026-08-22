import { redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export type Role = "cliente" | "organizador" | "portaria";

export async function requireRole(...roles: Role[]) {
	const { data: session } = await authClient.getSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;

	if (!session || !role || !roles.includes(role)) {
		throw redirect({ to: "/login" });
	}

	return session;
}

export async function redirectIfAuthenticated() {
	const { data: session } = await authClient.getSession();

	if (session) {
		throw redirect({ to: "/" });
	}
}
