import { createFileRoute, useNavigate } from "@tanstack/react-router";

import BackLink from "@/components/molecules/back-link";
import ComboForm from "@/components/organisms/combo-form";
import { requireRole } from "@/lib/route-guards";

export const Route = createFileRoute("/organizer/combos/new")({
	component: NewComboComponent,
	beforeLoad: () => requireRole("organizador"),
});

function NewComboComponent() {
	const navigate = useNavigate();

	return (
		<div className="container mx-auto max-w-2xl px-4 py-6">
			<BackLink to="/organizer/combos" label="Combos" />
			<h1 className="mb-6 font-bold text-2xl">Criar combo</h1>
			<ComboForm onSaved={() => navigate({ to: "/organizer/combos" })} />
		</div>
	);
}
