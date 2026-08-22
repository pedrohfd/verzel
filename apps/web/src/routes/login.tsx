import { createFileRoute } from "@tanstack/react-router";

import SignInForm from "@/components/organisms/sign-in-form";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export const Route = createFileRoute("/login")({
	component: SignInForm,
	beforeLoad: redirectIfAuthenticated,
});
