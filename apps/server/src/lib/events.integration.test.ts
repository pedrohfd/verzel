import { db } from "@verzel/db";
import * as schema from "@verzel/db/schema";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetTestData } from "../test-helpers/db";
import { createEvent, createOrganizer } from "../test-helpers/fixtures";
import { publishEvent } from "./events";

beforeEach(async () => {
	await resetTestData();
});

async function statusOf(eventId: string) {
	const event = await db.query.events.findFirst({
		where: eq(schema.events.id, eventId),
	});
	return event?.status;
}

describe("publishEvent", () => {
	it("publishes a draft session", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "draft" });

		const published = await publishEvent(event.id, organizer.id);

		expect(published?.status).toBe("published");
	});

	it("refuses to publish a cancelled session", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "cancelled" });

		await expect(publishEvent(event.id, organizer.id)).rejects.toMatchObject({
			code: "INVALID_EVENT_TRANSITION",
		});
		expect(await statusOf(event.id)).toBe("cancelled");
	});

	it("refuses to publish a session that is already published", async () => {
		const organizer = await createOrganizer();
		const event = await createEvent(organizer.id, { status: "published" });

		await expect(publishEvent(event.id, organizer.id)).rejects.toMatchObject({
			code: "INVALID_EVENT_TRANSITION",
		});
	});
});
