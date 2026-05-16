// Tiny fetch wrapper around the UniRate REST API. Stays dependency-free so
// the integration adds no runtime weight to Astro builds; native fetch is
// available in Node 18+ (required by Astro 4) and at the edge.
//
// Only the free-tier endpoints used by the integration are exposed:
//   GET /api/rates       — current rates for one base
//   GET /api/convert     — single amount conversion
//   GET /api/currencies  — supported ISO codes
//
// `Accept: application/json` is set on every request because
// /api/currencies returns HTML 404 without it (see project CLAUDE.md
// "Key gotchas" #2).

export class UniRateError extends Error {
  readonly status?: number;
  readonly body?: unknown;
  constructor(message: string, status?: number, body?: unknown) {
    super(message);
    this.name = "UniRateError";
    this.status = status;
    this.body = body;
  }
}

export interface UniRateClientOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface RatesResponse {
  rates: Record<string, number>;
  base: string;
  fetchedAt: string;
}

const DEFAULT_BASE_URL = "https://api.unirateapi.com";
const DEFAULT_TIMEOUT_MS = 15_000;

const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? Number.parseFloat(v) : (v as number);
  if (!Number.isFinite(n)) throw new UniRateError(`Non-numeric rate value: ${String(v)}`);
  return n;
};

export class UniRateClient {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor(opts: UniRateClientOptions) {
    if (!opts.apiKey) throw new UniRateError("apiKey is required");
    this.#apiKey = opts.apiKey;
    this.#baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.#fetch = opts.fetch ?? globalThis.fetch;
    this.#timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (typeof this.#fetch !== "function") {
      throw new UniRateError("global fetch is unavailable; pass `fetch` explicitly");
    }
  }

  async #get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(this.#baseUrl + path);
    url.searchParams.set("api_key", this.#apiKey);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.#timeoutMs);
    try {
      const res = await this.#fetch(url.toString(), {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        throw new UniRateError(`Non-JSON response from ${path}`, res.status, text);
      }
      if (!res.ok) {
        const msg =
          (body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `HTTP ${res.status} from ${path}`);
        throw new UniRateError(msg, res.status, body);
      }
      return body as T;
    } finally {
      clearTimeout(timer);
    }
  }

  async getRates(from: string, to?: string[]): Promise<RatesResponse> {
    const params: Record<string, string | undefined> = { from };
    if (to && to.length > 0) params.to = to.join(",");
    const raw = await this.#get<{ rates?: Record<string, string | number>; rate?: string | number }>(
      "/api/rates",
      params,
    );
    const rates: Record<string, number> = {};
    if (raw.rates) {
      for (const [code, val] of Object.entries(raw.rates)) rates[code] = toNum(val);
    } else if (raw.rate !== undefined && to && to.length === 1) {
      rates[to[0]!] = toNum(raw.rate);
    } else {
      throw new UniRateError("Malformed /api/rates response", undefined, raw);
    }
    rates[from] = 1;
    return { rates, base: from, fetchedAt: new Date().toISOString() };
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    const raw = await this.#get<{ result?: string | number }>("/api/convert", { from, to, amount });
    if (raw.result === undefined) throw new UniRateError("Malformed /api/convert response", undefined, raw);
    return toNum(raw.result);
  }

  async listCurrencies(): Promise<string[]> {
    const raw = await this.#get<{ currencies?: string[] }>("/api/currencies", {});
    if (!Array.isArray(raw.currencies)) {
      throw new UniRateError("Malformed /api/currencies response", undefined, raw);
    }
    return raw.currencies;
  }
}
