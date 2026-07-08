# @unirate/astro

Astro integration for [UniRate](https://unirateapi.com) — fetches a currency exchange rate snapshot at build time, exposes it as a Vite virtual module, and ships `<Currency />` and `<Rate />` components plus runtime conversion helpers.

- Build-time snapshot: rates resolve to constants in your static HTML; no client-side API key, no runtime fetch.
- Zero runtime dependencies (uses native `fetch`).
- Cross-pair conversion derived from a single base, so the snapshot stays small.
- Astro 4 + 5 compatible. Works with `static` and `server` output.

## Install

```sh
npm install @unirate/astro
```

You'll need a free UniRate API key — grab one at <https://unirateapi.com>.

## Configure

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import unirate from "@unirate/astro";

export default defineConfig({
  integrations: [
    unirate({
      apiKey: process.env.UNIRATE_API_KEY,
      baseCurrency: "USD",
      currencies: ["EUR", "GBP", "JPY", "CAD", "AUD"],
    }),
  ],
});
```

If `apiKey` is omitted the integration reads `UNIRATE_API_KEY` from the environment.

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | `process.env.UNIRATE_API_KEY` | UniRate API key. |
| `baseCurrency` | `string` | `"USD"` | Base the build-time snapshot is keyed against. |
| `currencies` | `string[]` | _all UniRate currencies_ | Optional allowlist to shrink the bundled snapshot. |
| `apiBaseUrl` | `string` | `"https://api.unirateapi.com"` | API host. Override for self-hosted or testing. |
| `failOnFetchError` | `boolean` | `true` | Fail the build if the snapshot fetch fails. Set to `false` to ship an empty snapshot and let components fall back gracefully. |

## Use the components

```astro
---
import Currency from "@unirate/astro/components/Currency.astro";
import Rate from "@unirate/astro/components/Rate.astro";
---
<p>Subtotal: <Currency amount={100} from="USD" to="EUR" /></p>
<p>Today's USD/EUR rate: <Rate from="USD" to="EUR" /></p>
<p>Cross-pair (derived): <Rate from="EUR" to="GBP" precision={6} /></p>
```

`<Currency />` supports the same options as `Intl.NumberFormat`'s currency style:

```astro
<Currency amount={1234.5} from="USD" to="JPY" minimumFractionDigits={0} />
<Currency amount={100} from="USD" to="EUR" currencyDisplay="code" />
<Currency amount={100} from="USD" to="EUR" as="text" />
```

Pass `as="text"` to render the bare string with no wrapping `<span>` — useful inside `<title>` or table cells.

## Use the helpers directly

```astro
---
import { convertCurrency, getRate, formatCurrency, fetchedAt } from "@unirate/astro/runtime";

const eur = convertCurrency(100, "USD", "EUR");
const rate = getRate("USD", "EUR");
---
<p>{formatCurrency(eur, "EUR")}</p>
<p>Rate: {rate.toFixed(4)}</p>
<footer>Rates as of {fetchedAt}</footer>
```

The runtime entry also exports the raw `snapshot`, `base`, `rates`, and `fetchedAt` for advanced use cases (e.g. building your own table of all rates).

## How the build works

`astro:config:setup` fetches `/api/rates?from=<baseCurrency>[&to=...]` once, then registers a Vite plugin that resolves `virtual:unirate` to the snapshot as a frozen ES module. Components and helpers read from that virtual module, so by the time Astro renders pages every rate is already a constant in the bundle.

`astro:config:done` calls `injectTypes` to write the `virtual:unirate` ambient declaration into your `.astro/integrations/@unirate/astro/` dir — your tsconfig picks it up automatically with no extra setup.

Cross-pair rates are derived at render time: `rate(from → to) = rate(base → to) / rate(base → from)`. This means a snapshot keyed against USD can convert EUR → GBP without an extra fetch.

## Static vs. server output

- **Static (`output: "static"`, default).** Rates are baked into the rendered HTML. No client-side requests; no API key in the browser bundle.
- **Server (`output: "server"`).** Rates are still fetched once at build/start and frozen for the life of the process. Restart the server to refresh.

<!-- unirate-ecosystem-footer:start -->
## UniRate ecosystem

UniRate ships official integrations for 40+ ecosystems, all maintained under the
[UniRate-API](https://github.com/UniRate-API) org.

**Core clients (9 languages)**
[Python](https://github.com/UniRate-API/unirate-api-python) ·
[Node.js / TypeScript](https://github.com/UniRate-API/unirate-api-nodejs) ·
[Go](https://github.com/UniRate-API/unirate-api-go) ·
[Rust](https://github.com/UniRate-API/unirate-api-rust) ·
[Java](https://github.com/UniRate-API/unirate-api-java) ·
[Ruby](https://github.com/UniRate-API/unirate-api-ruby) ·
[PHP](https://github.com/UniRate-API/unirate-api-php) ·
[.NET](https://github.com/UniRate-API/unirate-api-dotnet) ·
[Swift](https://github.com/UniRate-API/unirate-api-swift)

**JavaScript / TypeScript**
[React](https://github.com/UniRate-API/react-unirate) ·
[Next.js](https://github.com/UniRate-API/next-unirate) ·
[Remix](https://github.com/UniRate-API/remix-unirate) ·
[SvelteKit](https://github.com/UniRate-API/sveltekit-unirate) ·
[Vue](https://github.com/UniRate-API/vue-unirate) ·
[Angular](https://github.com/UniRate-API/angular-unirate) ·
[Nuxt](https://github.com/UniRate-API/nuxt-unirate) ·
[NestJS](https://github.com/UniRate-API/nestjs-unirate) ·
[tRPC](https://github.com/UniRate-API/trpc-unirate)

**Static-site generators**
[Astro](https://github.com/UniRate-API/astro-unirate) ·
[Eleventy](https://github.com/UniRate-API/eleventy-unirate) ·
[Hugo](https://github.com/UniRate-API/hugo-unirate) ·
[Jekyll](https://github.com/UniRate-API/jekyll-unirate)

**CMS & e-commerce**
[Wagtail](https://github.com/UniRate-API/wagtail-unirate) ·
[WordPress](https://github.com/UniRate-API/unirate-currency-converter) ·
[WooCommerce](https://github.com/UniRate-API/unirate-woocs) ·
[Drupal](https://github.com/UniRate-API/drupal-unirate) ·
[Strapi](https://github.com/UniRate-API/strapi-plugin-unirate) ·
[Medusa](https://github.com/UniRate-API/medusa-plugin-unirate) ·
[Symfony](https://github.com/UniRate-API/unirate-bundle) ·
[Laravel](https://github.com/UniRate-API/laravel-money-unirate) ·
[Directus](https://github.com/UniRate-API/directus-extension-unirate)

**Data, AI & backend**
[LangChain (Python)](https://github.com/UniRate-API/langchain-unirate) ·
[LangChain.js](https://github.com/UniRate-API/langchain-js-unirate) ·
[FastAPI](https://github.com/UniRate-API/fastapi-unirate) ·
[Flask](https://github.com/UniRate-API/flask-unirate) ·
[Django REST Framework](https://github.com/UniRate-API/djangorestframework-unirate) ·
[Apache Airflow](https://github.com/UniRate-API/airflow-provider-unirate) ·
[dbt](https://github.com/UniRate-API/dbt-unirate)

**Platform & tools**
[MCP server](https://github.com/UniRate-API/unirate-mcp) ·
[CLI](https://github.com/UniRate-API/unirate-cli) ·
[Cloudflare Workers](https://github.com/UniRate-API/cloudflare-workers-unirate) ·
[Home Assistant](https://github.com/UniRate-API/unirate-home-assistant) ·
[n8n](https://github.com/UniRate-API/n8n-nodes-unirate) ·
[Google Sheets](https://github.com/UniRate-API/unirate-sheets) ·
[VS Code](https://github.com/UniRate-API/vscode-unirate) ·
[Obsidian](https://github.com/UniRate-API/obsidian-currency)

**Money library bridges**
[money gem (Ruby)](https://github.com/UniRate-API/money-unirate-api) ·
[NodaMoney (.NET)](https://github.com/UniRate-API/UniRateApi.NodaMoney)

Get a free API key at [unirateapi.com](https://unirateapi.com).
<!-- unirate-ecosystem-footer:end -->

## License

MIT