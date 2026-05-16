// Ambient declaration for our own typecheck only. This file is NOT shipped
// to consumers — at integration runtime, `astro:config:setup` calls
// `injectTypes()` to write the same declaration into the consumer's
// `.astro/integrations/@unirate/astro/` directory, which their tsconfig
// auto-loads. Keeping the ambient decl out of the shipped .d.ts avoids
// polluting consumers who don't use the integration.
declare module "virtual:unirate" {
  interface RateSnapshot {
    base: string;
    rates: Record<string, number>;
    fetchedAt: string | null;
  }
  const snapshot: RateSnapshot;
  export default snapshot;
  export const base: string;
  export const rates: Record<string, number>;
  export const fetchedAt: string | null;
}
