import { describe, expect, it } from "vitest";
import { unirateVitePlugin, VIRTUAL_ID, RESOLVED_ID } from "../src/vite-plugin.js";

const SNAP = {
  base: "USD",
  rates: { USD: 1, EUR: 0.925 },
  fetchedAt: "2026-05-16T00:00:00.000Z",
};

describe("unirateVitePlugin", () => {
  it("resolves the virtual id and ignores everything else", () => {
    const plugin = unirateVitePlugin(SNAP);
    expect(plugin.resolveId(VIRTUAL_ID)).toBe(RESOLVED_ID);
    expect(plugin.resolveId("some-other-id")).toBeNull();
  });

  it("emits the snapshot as a frozen ES module", () => {
    const plugin = unirateVitePlugin(SNAP);
    const code = plugin.load(RESOLVED_ID);
    expect(code).not.toBeNull();
    expect(code).toContain("Object.freeze(");
    expect(code).toContain('"base":"USD"');
    expect(code).toContain('"EUR":0.925');
    expect(code).toContain("export default snapshot");
    expect(code).toContain("export const base = snapshot.base");
    expect(code).toContain("export const rates = snapshot.rates");
    expect(code).toContain("export const fetchedAt = snapshot.fetchedAt");
  });

  it("returns null for unrelated load() calls", () => {
    expect(unirateVitePlugin(SNAP).load("\0other")).toBeNull();
  });
});
