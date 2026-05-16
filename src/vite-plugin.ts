import type { RateSnapshot } from "./types.js";

const VIRTUAL_ID = "virtual:unirate";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

export interface VitePluginShape {
  name: string;
  resolveId(id: string): string | null;
  load(id: string): string | null;
}

/**
 * Vite plugin that exposes the build-time UniRate snapshot as
 * `import { snapshot, base, rates, fetchedAt } from "virtual:unirate"`.
 *
 * Returned as a plain object rather than imported from `vite` so unit tests
 * can drive it without spinning a full Vite server. Astro accepts any value
 * matching Vite's Plugin shape via `updateConfig({ vite: { plugins: [...] } })`.
 */
export function unirateVitePlugin(snapshot: RateSnapshot): VitePluginShape {
  const payload = JSON.stringify(snapshot);
  return {
    name: "unirate:virtual-snapshot",
    resolveId(id: string) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id: string) {
      if (id !== RESOLVED_ID) return null;
      return [
        `const snapshot = Object.freeze(${payload});`,
        `export default snapshot;`,
        `export const snapshot_ = snapshot;`,
        `export const base = snapshot.base;`,
        `export const rates = snapshot.rates;`,
        `export const fetchedAt = snapshot.fetchedAt;`,
      ].join("\n");
    },
  };
}

export { VIRTUAL_ID, RESOLVED_ID };
