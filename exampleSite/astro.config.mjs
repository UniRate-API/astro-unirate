import { defineConfig } from "astro/config";
import unirate from "@unirate/astro";

export default defineConfig({
  integrations: [
    unirate({
      apiKey: process.env.UNIRATE_API_KEY,
      baseCurrency: "USD",
      currencies: ["EUR", "GBP", "JPY"],
      apiBaseUrl: process.env.UNIRATE_API_BASE_URL ?? "https://api.unirateapi.com",
    }),
  ],
});
