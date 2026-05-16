import { describe, expect, it, vi } from "vitest";
import unirate from "../src/index.js";

interface CapturedConfig {
  vite?: { plugins?: Array<{ name: string; resolveId(id: string): string | null; load(id: string): string | null }> };
}

function makeHookArgs() {
  const updates: CapturedConfig[] = [];
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  return {
    updates,
    logger,
    arg: {
      updateConfig: (cfg: CapturedConfig) => {
        updates.push(cfg);
        return cfg;
      },
      logger,
    },
  };
}

function withFetch(impl: typeof fetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = original;
  };
}

describe("unirate() integration", () => {
  it("exposes the standard Astro integration shape", () => {
    const integ = unirate({ apiKey: "k" });
    expect(integ.name).toBe("@unirate/astro");
    expect(typeof integ.hooks["astro:config:setup"]).toBe("function");
  });

  it("fetches a snapshot and registers a vite plugin that resolves virtual:unirate", async () => {
    const restore = withFetch((async () =>
      new Response(JSON.stringify({ rates: { EUR: "0.925", GBP: "0.79" } }), {
        status: 200,
      })) as unknown as typeof fetch);
    try {
      const integ = unirate({ apiKey: "k", baseCurrency: "USD", apiBaseUrl: "http://mock" });
      const { arg, updates, logger } = makeHookArgs();
      await integ.hooks["astro:config:setup"]!(arg as never);

      expect(updates).toHaveLength(1);
      const plugin = updates[0]!.vite!.plugins![0]!;
      expect(plugin.resolveId("virtual:unirate")).toBe("\0virtual:unirate");
      const code = plugin.load("\0virtual:unirate")!;
      expect(code).toContain('"base":"USD"');
      expect(code).toContain('"EUR":0.925');
      expect(code).toContain('"USD":1');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("Fetched"));
    } finally {
      restore();
    }
  });

  it("throws by default if no apiKey is configured", async () => {
    const restore = withFetch((async () => {
      throw new Error("should not be called");
    }) as unknown as typeof fetch);
    try {
      const original = process.env.UNIRATE_API_KEY;
      delete process.env.UNIRATE_API_KEY;
      try {
        const integ = unirate({});
        const { arg } = makeHookArgs();
        await expect(integ.hooks["astro:config:setup"]!(arg as never)).rejects.toThrow(
          /No UniRate API key/,
        );
      } finally {
        if (original !== undefined) process.env.UNIRATE_API_KEY = original;
      }
    } finally {
      restore();
    }
  });

  it("ships an empty snapshot + warns when failOnFetchError is false", async () => {
    const restore = withFetch((async () =>
      new Response(JSON.stringify({ error: "rate limited" }), { status: 429 })) as unknown as typeof fetch);
    try {
      const integ = unirate({
        apiKey: "k",
        apiBaseUrl: "http://mock",
        failOnFetchError: false,
      });
      const { arg, updates, logger } = makeHookArgs();
      await integ.hooks["astro:config:setup"]!(arg as never);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("UniRate snapshot fetch failed"));
      const plugin = updates[0]!.vite!.plugins![0]!;
      const code = plugin.load("\0virtual:unirate")!;
      expect(code).toContain('"fetchedAt":null');
      expect(code).toContain('"USD":1');
    } finally {
      restore();
    }
  });

  it("uppercases baseCurrency and currencies before fetching", async () => {
    let captured: URL | null = null;
    const restore = withFetch((async (input: string | URL) => {
      captured = new URL(typeof input === "string" ? input : input.toString());
      return new Response(JSON.stringify({ rates: { GBP: "0.79" } }), { status: 200 });
    }) as unknown as typeof fetch);
    try {
      const integ = unirate({
        apiKey: "k",
        baseCurrency: "usd",
        currencies: ["gbp"],
        apiBaseUrl: "http://mock",
      });
      const { arg } = makeHookArgs();
      await integ.hooks["astro:config:setup"]!(arg as never);
      expect(captured!.searchParams.get("from")).toBe("USD");
      expect(captured!.searchParams.get("to")).toBe("GBP");
    } finally {
      restore();
    }
  });
});
