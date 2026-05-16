import type { AstroIntegration } from "astro";
import { fetchSnapshot, EMPTY_SNAPSHOT } from "./snapshot.js";
import { unirateVitePlugin } from "./vite-plugin.js";
import type { RateSnapshot, UniRateIntegrationOptions } from "./types.js";

export type { UniRateIntegrationOptions, RateSnapshot } from "./types.js";

const DEFAULT_BASE = "USD";
const DEFAULT_API = "https://api.unirateapi.com";

/**
 * Astro integration that fetches a UniRate snapshot at `astro:config:setup`
 * and exposes it to the build via a `virtual:unirate` Vite module. Pair
 * with the bundled `<Currency />` and `<Rate />` components, or import
 * `getRate` / `convertCurrency` from `@unirate/astro/runtime`.
 */
export default function unirate(options: UniRateIntegrationOptions = {}): AstroIntegration {
  const apiKey = options.apiKey ?? process.env.UNIRATE_API_KEY;
  const baseCurrency = (options.baseCurrency ?? DEFAULT_BASE).toUpperCase();
  const apiBaseUrl = options.apiBaseUrl ?? DEFAULT_API;
  const failOnFetchError = options.failOnFetchError ?? true;
  const currencies = options.currencies?.map((c) => c.toUpperCase());

  const virtualTypes = [
    'declare module "virtual:unirate" {',
    "  interface RateSnapshot {",
    "    base: string;",
    "    rates: Record<string, number>;",
    "    fetchedAt: string | null;",
    "  }",
    "  const snapshot: RateSnapshot;",
    "  export default snapshot;",
    "  export const base: string;",
    "  export const rates: Record<string, number>;",
    "  export const fetchedAt: string | null;",
    "}",
    "",
  ].join("\n");

  return {
    name: "@unirate/astro",
    hooks: {
      "astro:config:done": ({ injectTypes }) => {
        injectTypes({ filename: "types.d.ts", content: virtualTypes });
      },
      "astro:config:setup": async ({ updateConfig, logger }) => {
        let snapshot: RateSnapshot;
        if (!apiKey) {
          const msg =
            "No UniRate API key provided. Pass `apiKey` to the integration or set UNIRATE_API_KEY.";
          if (failOnFetchError) throw new Error(msg);
          logger.warn(msg + " Shipping empty rate snapshot.");
          snapshot = EMPTY_SNAPSHOT(baseCurrency);
        } else {
          try {
            snapshot = await fetchSnapshot({ apiKey, baseCurrency, apiBaseUrl, currencies });
            logger.info(
              `Fetched ${Object.keys(snapshot.rates).length} ${baseCurrency} rates from UniRate.`,
            );
          } catch (err) {
            const msg = `UniRate snapshot fetch failed: ${(err as Error).message}`;
            if (failOnFetchError) throw new Error(msg);
            logger.warn(msg + " Shipping empty rate snapshot.");
            snapshot = EMPTY_SNAPSHOT(baseCurrency);
          }
        }

        updateConfig({
          vite: {
            plugins: [unirateVitePlugin(snapshot)],
          },
        });
      },
    },
  };
}
