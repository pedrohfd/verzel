import { Link } from "@tanstack/react-router";
import { Input } from "@verzel/ui/components/input";
import { Search } from "lucide-react";

import UserMenu from "./user-menu";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between gap-4 px-2 py-1">
				<Link className="font-bold text-lg" to="/">
					verzel
				</Link>
				<div className="relative w-full max-w-sm">
					<Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
					<Input className="rounded-full pl-8" placeholder="Buscar filme..." />
				</div>
				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
