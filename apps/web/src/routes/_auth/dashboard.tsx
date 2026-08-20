import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useRouteContext();

	return (
		<div>
			<h1>Painel</h1>
			<p>Bem-vindo, {session.data?.user.name}</p>
		</div>
	);
}
