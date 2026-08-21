import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./use-debounce";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useDebouncedValue", () => {
	it("keeps the initial value before the delay elapses", () => {
		const { result } = renderHook(() => useDebouncedValue("initial", 200));

		expect(result.current).toBe("initial");
	});

	it("updates to the latest value once the delay elapses", () => {
		const { result, rerender } = renderHook(
			({ value }) => useDebouncedValue(value, 200),
			{ initialProps: { value: "a" } },
		);

		rerender({ value: "b" });
		expect(result.current).toBe("a");

		act(() => {
			vi.advanceTimersByTime(200);
		});

		expect(result.current).toBe("b");
	});
});
