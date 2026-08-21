import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/route-guards";

export default function RoleGate({
	role,
	children,
}: {
	role: Role;
	children: ReactNode;
}) {
	const { data: session } = authClient.useSession();
	const userRole = (session?.user as { role?: Role } | undefined)?.role;

	if (userRole !== role) return null;
	return children;
}
