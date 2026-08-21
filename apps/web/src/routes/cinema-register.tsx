import { createFileRoute } from "@tanstack/react-router";

import CinemaRegisterForm from "@/components/organisms/cinema-register-form";

export const Route = createFileRoute("/cinema-register")({
	component: CinemaRegisterForm,
});
