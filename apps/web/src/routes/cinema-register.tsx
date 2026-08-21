import { createFileRoute } from "@tanstack/react-router";

import CinemaRegisterForm from "@/components/cinema-register-form";

export const Route = createFileRoute("/cinema-register")({
	component: CinemaRegisterForm,
});
