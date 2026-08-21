import { createFileRoute } from "@tanstack/react-router";

import SignUpForm from "@/components/organisms/sign-up-form";

export const Route = createFileRoute("/register")({
	component: SignUpForm,
});
