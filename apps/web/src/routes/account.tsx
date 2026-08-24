import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getMyProfile } from "@/api/requests/users/get-my-profile";
import type { MyProfile } from "@/api/types";
import ChangePasswordForm from "@/components/organisms/change-password-form";
import CinemaInfoForm from "@/components/organisms/cinema-info-form";
import PersonalInfoForm from "@/components/organisms/personal-info-form";
import Loader from "@/components/ui/loader";
import { requireRole } from "@/lib/route-guards";
import { tryCatch } from "@/lib/try-catch";

export const Route = createFileRoute("/account")({
	component: AccountComponent,
	beforeLoad: () => requireRole("cliente", "organizador"),
});

function AccountComponent() {
	const [profile, setProfile] = useState<MyProfile | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const controller = new AbortController();

		(async () => {
			const [response, fetchError] = await tryCatch(
				getMyProfile(controller.signal),
			);
			if (fetchError) {
				setError("Não foi possível carregar seus dados.");
				return;
			}
			setProfile(response);
		})();

		return () => controller.abort();
	}, []);

	if (error) {
		return (
			<div className="container mx-auto max-w-2xl px-4 py-6">
				<p className="text-destructive text-sm">{error}</p>
			</div>
		);
	}

	if (!profile) return <Loader />;

	return (
		<div className="container mx-auto max-w-2xl px-4 py-6">
			<h1 className="mb-6 font-bold text-2xl">Minha Conta</h1>

			<div className="flex flex-col gap-6">
				<PersonalInfoForm profile={profile} onSaved={setProfile} />
				{profile.role === "organizador" && (
					<CinemaInfoForm profile={profile} onSaved={setProfile} />
				)}
				<ChangePasswordForm />
			</div>
		</div>
	);
}
