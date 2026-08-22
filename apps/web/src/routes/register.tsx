import { createFileRoute } from "@tanstack/react-router";

import SignUpForm from "@/components/organisms/sign-up-form";
import { redirectIfAuthenticated } from "@/lib/route-guards";

export const Route = createFileRoute("/register")({
	component: SignUpForm,
	beforeLoad: redirectIfAuthenticated,
});
