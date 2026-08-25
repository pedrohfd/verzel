import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@verzel/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@verzel/ui/components/dropdown-menu";
import { Skeleton } from "@verzel/ui/components/skeleton";

import { authClient } from "@/lib/auth-client";

import RoleGate from "./role-gate";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session) {
		return (
			<Link to="/login">
				<Button variant="outline">Entrar</Button>
			</Link>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						className="text-destructive hover:bg-transparent hover:text-destructive/80"
					/>
				}
			>
				Olá, {session.user.name}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
				<RoleGate role="cliente">
					<DropdownMenuGroup>
						<DropdownMenuItem render={<Link to="/account" />}>
							Minha Conta
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</RoleGate>
				{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
				<RoleGate role="organizador">
					<DropdownMenuGroup>
						<DropdownMenuItem render={<Link to="/account" />}>
							Minha Conta
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</RoleGate>
				{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
				<RoleGate role="cliente">
					<DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem render={<Link to="/tickets" />}>
							Meus Ingressos
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</RoleGate>
				{/* biome-ignore lint/a11y/useValidAriaRole: RoleGate's role prop is not an ARIA role */}
				<RoleGate role="organizador">
					<DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem render={<Link to="/organizer" />}>
							Minhas Sessões
						</DropdownMenuItem>
						<DropdownMenuItem render={<Link to="/organizer/rooms" />}>
							Minhas Salas
						</DropdownMenuItem>
						<DropdownMenuItem render={<Link to="/organizer/combos" />}>
							Combos
						</DropdownMenuItem>
						<DropdownMenuItem render={<Link to="/organizer/gatekeepers" />}>
							Porteiros
						</DropdownMenuItem>
					</DropdownMenuGroup>
				</RoleGate>
				<DropdownMenuGroup>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({
											to: "/",
										});
									},
								},
							});
						}}
					>
						Sair
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
