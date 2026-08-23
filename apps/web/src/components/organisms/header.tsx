import { Link } from "@tanstack/react-router";

import UserMenu from "../molecules/user-menu";
import SearchCommand from "./search-command";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between gap-4 px-2 py-1">
				<Link className="font-bold text-lg" to="/">
					Ticket
				</Link>
				<SearchCommand />
				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
