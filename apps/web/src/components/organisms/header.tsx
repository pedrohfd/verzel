import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import type { Role } from "@/lib/route-guards";

import UserMenu from "../molecules/user-menu";
import SearchCommand from "./search-command";

export default function Header() {
	const { data: session } = authClient.useSession();
	const role = (session?.user as { role?: Role } | undefined)?.role;

	return (
		<div>
			<div className="flex flex-row items-center justify-between gap-4 px-2 py-1">
				<Link className="font-bold text-lg" to="/">
					Ticket
				</Link>
				{role !== "portaria" && <SearchCommand />}
				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
