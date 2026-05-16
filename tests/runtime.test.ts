import { describe, expect, it } from "vitest";
import {
  base,
  rates,
  fetchedAt,
  getRate,
  convertCurrency,
  formatCurrency,
  UnknownCurrencyError,
} from "../src/runtime/index.js";

describe("runtime fixture snapshot", () => {
  it("re-exports the snapshot fields", () => {
    expect(base).toBe("USD");
    expect(rates.USD).toBe(1);
    expect(rates.EUR).toBeCloseTo(0.925);
    expect(fetchedAt).toBe("2026-05-16T00:00:00.000Z");
  });
});

describe("getRate", () => {
  it("returns 1 for a self-pair regardless of case", () => {
    expect(getRate("usd", "USD")).toBe(1);
  });

  it("derives a cross-pair from a single-base snapshot", () => {
    // base=USD, EUR=0.925, GBP=0.79 → EUR→GBP = 0.79 / 0.925
    expect(getRate("EUR", "GBP")).toBeCloseTo(0.79 / 0.925, 8);
  });

  it("normalizes case for the from/to args", () => {
    expect(getRate("eur", "gbp")).toBeCloseTo(0.79 / 0.925, 8);
  });

  it("throws UnknownCurrencyError for codes absent from the snapshot", () => {
    expect(() => getRate("USD", "XXX")).toThrow(UnknownCurrencyError);
    expect(() => getRate("ZZZ", "USD")).toThrow(UnknownCurrencyError);
  });
});

describe("convertCurrency", () => {
  it("multiplies the amount by the derived rate", () => {
    expect(convertCurrency(100, "USD", "EUR")).toBeCloseTo(92.5, 6);
  });

  it("returns the amount unchanged for a self-pair", () => {
    expect(convertCurrency(100, "USD", "USD")).toBe(100);
  });

  it("accepts an explicit snapshot override", () => {
    const snap = { base: "EUR", rates: { EUR: 1, USD: 1.08 }, fetchedAt: null };
    expect(convertCurrency(50, "EUR", "USD", snap)).toBe(54);
  });
});

describe("formatCurrency", () => {
  it("renders using Intl by default", () => {
    const out = formatCurrency(92.5, "EUR");
    // en-US Intl typically renders €92.50 — assert digit + code-or-symbol presence
    expect(out).toMatch(/92[.,]50/);
  });

  it("supports currencyDisplay: 'code' for narrow contexts", () => {
    const out = formatCurrency(92.5, "EUR", { currencyDisplay: "code" });
    expect(out).toContain("EUR");
    expect(out).toMatch(/92[.,]50/);
  });

  it("locale: null skips Intl and returns plain '<amount> <code>'", () => {
    expect(formatCurrency(92.5, "EUR", { locale: null })).toBe("92.50 EUR");
  });

  it("still renders unknown ISO codes (Intl prefixes them as literal codes)", () => {
    const out = formatCurrency(1, "ZZZ");
    expect(out).toContain("ZZZ");
    expect(out).toMatch(/1[.,]00/);
  });

  it("locale: null fallback handles codes that would normally trip Intl too", () => {
    expect(formatCurrency(1, "ZZZ", { locale: null })).toBe("1.00 ZZZ");
  });

  it("honors minimum/maximum fraction digits", () => {
    expect(formatCurrency(1, "USD", { minimumFractionDigits: 4, locale: null })).toBe("1.0000 USD");
  });
});
