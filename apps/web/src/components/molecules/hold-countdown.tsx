import { useEffect, useRef, useState } from "react";

type HoldCountdownProps = {
	expiresAt: string;
	onExpire?: () => void;
};

function remainingSeconds(expiresAt: string) {
	return Math.max(
		0,
		Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
	);
}

export default function HoldCountdown({
	expiresAt,
	onExpire,
}: HoldCountdownProps) {
	const [seconds, setSeconds] = useState(() => remainingSeconds(expiresAt));
	const onExpireRef = useRef(onExpire);
	onExpireRef.current = onExpire;

	useEffect(() => {
		setSeconds(remainingSeconds(expiresAt));
		const interval = setInterval(() => {
			const left = remainingSeconds(expiresAt);
			setSeconds(left);
			if (left === 0) {
				clearInterval(interval);
				onExpireRef.current?.();
			}
		}, 1000);
		return () => clearInterval(interval);
	}, [expiresAt]);

	if (seconds === 0) {
		return <p className="text-destructive text-sm">Sua reserva expirou.</p>;
	}

	const minutes = Math.floor(seconds / 60);
	const rest = String(seconds % 60).padStart(2, "0");
	return (
		<p className="text-muted-foreground text-sm">
			Seus assentos ficam reservados por mais {minutes}:{rest}
		</p>
	);
}
