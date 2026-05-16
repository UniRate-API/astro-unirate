import { describe, expect, it, vi } from "vitest";
import { UniRateClient, UniRateError } from "../src/client.js";

function mockFetch(responses: Array<{ status?: number; body: unknown; assert?: (url: URL) => void }>) {
  const calls: URL[] = [];
  const seq = [...responses];
  const impl = vi.fn(async (input: string | URL) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    calls.push(url);
    const next = seq.shift();
    if (!next) throw new Error(`No more mock responses queued; called ${url.toString()}`);
    next.assert?.(url);
    const body = typeof next.body === "string" ? next.body : JSON.stringify(next.body);
    return new Response(body, {
      status: next.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe("UniRateClient", () => {
  it("requires an apiKey", () => {
    expect(() => new UniRateClient({ apiKey: "" })).toThrow(UniRateError);
  });

  it("getRates without `to` parses { rates: {...} } and inserts the base", async () => {
    const { impl, calls } = mockFetch([
      {
        assert(url) {
          expect(url.pathname).toBe("/api/rates");
          expect(url.searchParams.get("api_key")).toBe("key-123");
          expect(url.searchParams.get("from")).toBe("USD");
          expect(url.searchParams.has("to")).toBe(false);
        },
        body: { rates: { EUR: "0.925", GBP: "0.79", JPY: 147.32 } },
      },
    ]);
    const client = new UniRateClient({ apiKey: "key-123", fetch: impl });
    const res = await client.getRates("USD");
    expect(res.base).toBe("USD");
    expect(res.rates).toEqual({ USD: 1, EUR: 0.925, GBP: 0.79, JPY: 147.32 });
    expect(res.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(calls).toHaveLength(1);
  });

  it("getRates with single `to` accepts the shorthand { rate } shape", async () => {
    const { impl } = mockFetch([
      {
        assert(url) {
          expect(url.searchParams.get("to")).toBe("EUR");
        },
        body: { rate: "0.925" },
      },
    ]);
    const client = new UniRateClient({ apiKey: "k", fetch: impl });
    const res = await client.getRates("USD", ["EUR"]);
    expect(res.rates).toEqual({ USD: 1, EUR: 0.925 });
  });

  it("getRates joins multi-currency `to` lists with commas", async () => {
    const { impl } = mockFetch([
      {
        assert(url) {
          expect(url.searchParams.get("to")).toBe("EUR,GBP");
        },
        body: { rates: { EUR: "0.925", GBP: "0.79" } },
      },
    ]);
    const client = new UniRateClient({ apiKey: "k", fetch: impl });
    const res = await client.getRates("USD", ["EUR", "GBP"]);
    expect(res.rates).toEqual({ USD: 1, EUR: 0.925, GBP: 0.79 });
  });

  it("convert parses the { result } scalar", async () => {
    const { impl } = mockFetch([{ body: { result: "92.50" } }]);
    const client = new UniRateClient({ apiKey: "k", fetch: impl });
    expect(await client.convert(100, "USD", "EUR")).toBe(92.5);
  });

  it("listCurrencies sends Accept: application/json", async () => {
    const headerCalls: Headers[] = [];
    const impl = (async (input: string | URL, init?: RequestInit) => {
      headerCalls.push(new Headers(init?.headers));
      return new Response(JSON.stringify({ currencies: ["USD", "EUR"] }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new UniRateClient({ apiKey: "k", fetch: impl });
    const list = await client.listCurrencies();
    expect(list).toEqual(["USD", "EUR"]);
    expect(headerCalls[0]!.get("accept")).toBe("application/json");
  });

  it("propagates non-2xx status into UniRateError with the body", async () => {
    const { impl } = mockFetch([{ status: 403, body: { error: "Pro tier required" } }]);
    const client = new UniRateClient({ apiKey: "k", fetch: impl });
    await expect(client.getRates("USD")).rejects.toMatchObject({
      name: "UniRateError",
      status: 403,
      message: "Pro tier required",
    });
  });

  it("treats non-JSON responses as errors (the /api/currencies HTML 404 case)", async () => {
    const impl = (async () =>
      new Response("<html>404 not found</html>", {
        status: 404,
        headers: { "Content-Type": "text/html" },
      })) as unknown as typeof fetch;
    const client = new UniRateClient({ apiKey: "k", fetch: impl });
    await expect(client.listCurrencies()).rejects.toBeInstanceOf(UniRateError);
  });
});
