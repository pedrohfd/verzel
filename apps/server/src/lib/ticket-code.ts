import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@verzel/env/server";

interface TicketPayload {
	ticketId: string;
	eventId: string;
	issuedAt: number;
}

function sign(payload: string): string {
	return createHmac("sha256", env.TICKET_SIGNING_SECRET)
		.update(payload)
		.digest("base64url");
}

export function signTicket({ ticketId, eventId, issuedAt }: TicketPayload): {
	code: string;
	signature: string;
} {
	const payload = `${ticketId}:${eventId}:${issuedAt}`;
	const signature = sign(payload);
	return { code: `${ticketId}.${eventId}.${issuedAt}.${signature}`, signature };
}

export function verifyTicketCode(code: string): TicketPayload | null {
	const parts = code.trim().split(".");
	if (parts.length !== 4) return null;

	const [ticketId, eventId, issuedAtRaw, signature] = parts;
	if (!ticketId || !eventId || !issuedAtRaw || !signature) return null;

	const issuedAt = Number(issuedAtRaw);
	if (!Number.isFinite(issuedAt)) return null;

	const expected = sign(`${ticketId}:${eventId}:${issuedAtRaw}`);

	const expectedBuffer = Buffer.from(expected);
	const signatureBuffer = Buffer.from(signature);
	if (expectedBuffer.length !== signatureBuffer.length) return null;
	if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

	return { ticketId, eventId, issuedAt };
}

export function generateShareToken(): string {
	return randomBytes(24).toString("base64url");
}
