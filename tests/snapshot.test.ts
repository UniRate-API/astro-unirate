import { describe, expect, it, vi } from "vitest";
import { fetchSnapshot, EMPTY_SNAPSHOT } from "../src/snapshot.js";

describe("fetchSnapshot", () => {
  it("returns a {base, rates, fetchedAt} triple including the base self-rate", async () => {
    const impl = vi.fn(async () =>
      new Response(JSON.stringify({ rates: { EUR: "0.925", GBP: "0.79" } }), { status: 200 }),
    ) as unknown as typeof fetch;
    const snap = await fetchSnapshot(
      { apiKey: "k", baseCurrency: "USD", apiBaseUrl: "http://mock" },
      impl,
    );
    expect(snap.base).toBe("USD");
    expect(snap.rates).toEqual({ USD: 1, EUR: 0.925, GBP: 0.79 });
    expect(snap.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("passes through the currencies allowlist as the `to` param", async () => {
    let captured: URL | null = null;
    const impl = (async (input: string | URL) => {
      captured = new URL(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ rates: { EUR: "0.925" } }), { status: 200 });
    }) as unknown as typeof fetch;
    await fetchSnapshot(
      { apiKey: "k", baseCurrency: "USD", apiBaseUrl: "http://mock", currencies: ["EUR"] },
      impl,
    );
    expect(captured!.searchParams.get("to")).toBe("EUR");
  });
});

describe("EMPTY_SNAPSHOT", () => {
  it("is a valid one-entry snapshot for the requested base", () => {
    expect(EMPTY_SNAPSHOT("EUR")).toEqual({ base: "EUR", rates: { EUR: 1 }, fetchedAt: null });
  });
});
