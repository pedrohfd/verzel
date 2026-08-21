import { Link } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";

import RoleGate from "./role-gate";
import SearchCommand from "./search-command";
import UserMenu from "./user-menu";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between gap-4 px-2 py-1">
				<Link className="font-bold text-lg" to="/">
					verzel
				</Link>
				<SearchCommand />
				<div className="flex items-center gap-2">
					{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
					<RoleGate role="cliente">
						<Link to="/tickets">
							<Button variant="ghost">Meus Ingressos</Button>
						</Link>
					</RoleGate>
					{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
					<RoleGate role="organizador">
						<Link to="/organizer">
							<Button variant="ghost">Meus Eventos</Button>
						</Link>
					</RoleGate>
					{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
					<RoleGate role="portaria">
						<Link to="/portaria">
							<Button variant="ghost">Portaria</Button>
						</Link>
					</RoleGate>
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
