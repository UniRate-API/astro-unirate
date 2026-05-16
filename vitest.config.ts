import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      // The runtime entry statically imports `virtual:unirate`; that ID is
      // only resolvable inside an Astro/Vite build. For unit tests we
      // alias it to a fixture so the import resolves without spinning up
      // a full Vite server.
      "virtual:unirate": fileURLToPath(new URL("./tests/fixtures/virtual-unirate.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
