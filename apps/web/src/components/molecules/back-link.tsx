import { Link, useRouter } from "@tanstack/react-router";
import { cn } from "@verzel/ui/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { ComponentProps, MouseEvent } from "react";

type BackLinkProps = ComponentProps<typeof Link> & { label: string };

export default function BackLink({
	label,
	className,
	to,
	onClick,
	...linkProps
}: BackLinkProps) {
	const router = useRouter();

	function handleClick(event: MouseEvent<HTMLAnchorElement>) {
		onClick?.(event);
		if (event.defaultPrevented) return;
		if (
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		event.preventDefault();
		if (router.history.canGoBack()) {
			router.history.back();
		} else {
			router.navigate({ to });
		}
	}

	return (
		<Link
			{...linkProps}
			to={to}
			onClick={handleClick}
			className={cn(
				"mb-4 inline-flex w-fit items-center gap-1 text-primary text-sm hover:underline",
				className,
			)}
		>
			<ArrowLeft className="size-4" />
			{label}
		</Link>
	);
}
