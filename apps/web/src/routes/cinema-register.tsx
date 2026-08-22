import { createFileRoute } from "@tanstack/react-router";

import CinemaRegisterForm from "@/components/organisms/cinema-register-form";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export const Route = createFileRoute("/cinema-register")({
	component: CinemaRegisterForm,
	beforeLoad: redirectIfAuthenticated,
});
