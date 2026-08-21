import { describe, expect, it } from "vitest";

import { tryCatch } from "./try-catch";

describe("tryCatch", () => {
	it("returns [data, null] when the promise resolves", async () => {
		const [data, error] = await tryCatch(Promise.resolve("value"));

		expect(data).toBe("value");
		expect(error).toBeNull();
	});

	it("returns [null, error] when the promise rejects", async () => {
		const rejection = new Error("failed");
		const [data, error] = await tryCatch(Promise.reject(rejection));

		expect(data).toBeNull();
		expect(error).toBe(rejection);
	});
});
