import { describe, expect, it } from "vitest";

import { maskCep, maskCnpj, maskCurrencyBRL, maskUf } from "./masks";

describe("maskCnpj", () => {
	it("formats a complete CNPJ", () => {
		expect(maskCnpj("12345678000195")).toBe("12.345.678/0001-95");
	});

	it("formats a partial CNPJ as the user types", () => {
		expect(maskCnpj("12345678")).toBe("12.345.678");
	});

	it("strips non-digit characters and limits to 14 digits", () => {
		expect(maskCnpj("12.345.678/0001-95extra99")).toBe("12.345.678/0001-95");
	});
});

describe("maskCep", () => {
	it("formats a complete CEP", () => {
		expect(maskCep("12345678")).toBe("12345-678");
	});

	it("formats a partial CEP as the user types", () => {
		expect(maskCep("123")).toBe("123");
	});

	it("strips non-digit characters and limits to 8 digits", () => {
		expect(maskCep("12345-678extra99")).toBe("12345-678");
	});
});

describe("maskCurrencyBRL", () => {
	it("returns an empty string for empty input", () => {
		expect(maskCurrencyBRL("")).toBe("");
	});

	it("formats single digits as cents", () => {
		expect(maskCurrencyBRL("3")).toBe("0,03");
	});

	it("formats larger values with thousands digits", () => {
		expect(maskCurrencyBRL("35500")).toBe("355,00");
	});

	it("strips non-digit characters", () => {
		expect(maskCurrencyBRL("R$35,00")).toBe("35,00");
	});
});

describe("maskUf", () => {
	it("uppercases letters", () => {
		expect(maskUf("sp")).toBe("SP");
	});

	it("strips non-letter characters", () => {
		expect(maskUf("s1p")).toBe("SP");
	});

	it("limits to 2 characters", () => {
		expect(maskUf("saopaulo")).toBe("SA");
	});
});
