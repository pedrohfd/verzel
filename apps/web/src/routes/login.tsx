import { createFileRoute } from "@tanstack/react-router";

import SignInForm from "@/components/organisms/sign-in-form";

export const Route = createFileRoute("/login")({
	component: SignInForm,
});
