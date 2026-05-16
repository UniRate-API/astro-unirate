export interface UniRateIntegrationOptions {
  /** UniRate API key. Required. Read from `UNIRATE_API_KEY` env var if omitted. */
  apiKey?: string;

  /**
   * Base currency the rate snapshot is keyed against. All build-time rates
   * are stored as `base → other`. Cross-pair conversions are derived at
   * runtime, so picking a single base keeps the snapshot small.
   */
  baseCurrency?: string;

  /**
   * Quote currencies to pre-fetch at build time. If omitted, all currencies
   * UniRate supports are fetched (one /api/rates call, no `to` param).
   * Pass an explicit list to shrink the bundled snapshot for static sites
   * that only care about a handful of pairs.
   */
  currencies?: string[];

  /**
   * Override the API host. Useful for the test mock and self-hosted setups.
   * Defaults to `https://api.unirateapi.com`.
   */
  apiBaseUrl?: string;

  /**
   * If `true`, build errors when the snapshot fetch fails (default).
   * If `false`, the integration logs a warning and ships an empty snapshot
   * — components fall back to displaying the source amount unchanged so
   * the site still builds.
   */
  failOnFetchError?: boolean;

  /**
   * If set, also include the snapshot's fetch timestamp in the virtual
   * module so consumers can render a "rates as of …" footer.
   * Defaults to `true`.
   */
  includeFetchedAt?: boolean;
}

export interface RateSnapshot {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string | null;
}
