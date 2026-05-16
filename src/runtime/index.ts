import type { RateSnapshot } from "../types.js";
import snapshot from "virtual:unirate";

export { snapshot };
export const base: string = snapshot.base;
export const rates: Record<string, number> = snapshot.rates;
export const fetchedAt: string | null = snapshot.fetchedAt;

export class UnknownCurrencyError extends Error {
  readonly currency: string;
  constructor(currency: string) {
    super(`Unknown currency in snapshot: ${currency}`);
    this.name = "UnknownCurrencyError";
    this.currency = currency;
  }
}

/**
 * Derive a `from → to` rate from a snapshot keyed against a single base.
 * The math: rate(from→to) = rate(base→to) / rate(base→from).
 * Throws if either code isn't present in the snapshot.
 */
export function getRate(from: string, to: string, snap: RateSnapshot = snapshot): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return 1;
  const rf = snap.rates[f];
  const rt = snap.rates[t];
  if (rf === undefined) throw new UnknownCurrencyError(f);
  if (rt === undefined) throw new UnknownCurrencyError(t);
  return rt / rf;
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  snap: RateSnapshot = snapshot,
): number {
  return amount * getRate(from, to, snap);
}

export interface FormatOptions {
  /**
   * BCP-47 locale for `Intl.NumberFormat`. Defaults to "en-US".
   * Pass `null` to skip Intl and emit a plain `<amount> <code>` string.
   */
  locale?: string | null;

  /** Minimum decimal places. Defaults to 2. */
  minimumFractionDigits?: number;

  /** Maximum decimal places. Defaults to `minimumFractionDigits`. */
  maximumFractionDigits?: number;

  /**
   * Intl currency display style. Defaults to "symbol".
   * Set to "code" to render e.g. `EUR 92.50`.
   */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
}

export function formatCurrency(amount: number, currency: string, opts: FormatOptions = {}): string {
  const code = currency.toUpperCase();
  const min = opts.minimumFractionDigits ?? 2;
  const max = opts.maximumFractionDigits ?? min;
  if (opts.locale === null) {
    return `${amount.toFixed(max)} ${code}`;
  }
  try {
    return new Intl.NumberFormat(opts.locale ?? "en-US", {
      style: "currency",
      currency: code,
      currencyDisplay: opts.currencyDisplay ?? "symbol",
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(amount);
  } catch {
    // Intl throws on malformed args (bad locale tag, etc.) — unknown ISO
    // codes do NOT throw; Intl prefixes them as literal codes. Fall back
    // to `<amount> <code>` so the build never breaks.
    return `${amount.toFixed(max)} ${code}`;
  }
}
