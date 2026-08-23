import { createFileRoute, useNavigate } from "@tanstack/react-router";

import GatekeeperForm from "@/components/organisms/gatekeeper-form";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/organizer/gatekeepers/new")({
	component: NewGatekeeperComponent,
	beforeLoad: () => requireRole("organizador"),
});

function NewGatekeeperComponent() {
	const navigate = useNavigate();

	return (
		<div className="container mx-auto max-w-[1600px] px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Cadastrar porteiro</h1>
			<GatekeeperForm
				onSaved={() => navigate({ to: "/organizer/gatekeepers" })}
			/>
		</div>
	);
}
