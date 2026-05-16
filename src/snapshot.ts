import { UniRateClient } from "./client.js";
import type { RateSnapshot, UniRateIntegrationOptions } from "./types.js";

const EMPTY_SNAPSHOT = (base: string): RateSnapshot => ({
  base,
  rates: { [base]: 1 },
  fetchedAt: null,
});

export async function fetchSnapshot(
  opts: Required<Pick<UniRateIntegrationOptions, "apiKey" | "baseCurrency" | "apiBaseUrl">> &
    Pick<UniRateIntegrationOptions, "currencies">,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<RateSnapshot> {
  const client = new UniRateClient({
    apiKey: opts.apiKey,
    baseUrl: opts.apiBaseUrl,
    fetch: fetchImpl,
  });
  const { rates, fetchedAt } = await client.getRates(opts.baseCurrency, opts.currencies);
  return { base: opts.baseCurrency, rates, fetchedAt };
}

export { EMPTY_SNAPSHOT };
