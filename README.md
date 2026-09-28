# astro-shopsavvy

[![npm version](https://badge.fury.io/js/astro-shopsavvy.svg)](https://badge.fury.io/js/astro-shopsavvy)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Astro integration for the [ShopSavvy Data API](https://shopsavvy.com/data). Fetch live product data, price comparisons, price history, and shopping deals into your Astro site — at build time via Content Collections, on-demand via API endpoints, or in client islands.

Works with Astro 5+. Zero client-side JavaScript by default; only the `DealFeed` and `PriceHistory` components hydrate.

## Installation

```bash
npm install astro-shopsavvy
```

Then run `astro add` to register the integration automatically:

```bash
npx astro add astro-shopsavvy
```

Or add it manually in `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import shopsavvy from 'astro-shopsavvy'

export default defineConfig({
  integrations: [shopsavvy()],
})
```

(`shopsavvy` is also available as a named export.) `shopsavvy()` accepts `{ apiKey, baseUrl, timeout }`; with no `apiKey` it reads `SHOPSAVVY_API_KEY` from the environment. Set your API key in `.env`:

```
SHOPSAVVY_API_KEY=ss_live_your_api_key_here
```

Get your API key at [shopsavvy.com/data](https://shopsavvy.com/data).

## Content Collections (build-time)

Define a collection in `src/content.config.ts` using the `shopsavvyLoader` and the built-in Zod schema:

```ts
import { defineCollection } from 'astro:content'
import { shopsavvyLoader } from 'astro-shopsavvy'
import { ShopSavvySchema } from 'astro-shopsavvy'

export const collections = {
  products: defineCollection({
    loader: shopsavvyLoader({
      // Free-text search queries — results are collected into the collection
      queries: ['airpods pro', 'sony wh-1000xm5'],
      // Direct lookups by ASIN, UPC, barcode, URL, or model number
      identifiers: ['B09XS7JWHH'],
      // Fetch current offers (prices) for each product — default true
      includeOffers: true,
    }),
    schema: ShopSavvySchema,
  }),
}
```

Then use the collection in any page:

```astro
---
import { getCollection, getEntry } from 'astro:content'

const products = await getCollection('products')
const product  = await getEntry('products', 'B09XS7JWHH')
---
```

## Components

All components are server-rendered `.astro` files. Import them directly from the package — no client JS unless noted.

### `<ProductCard />`

Zero-JS product card with image, title, brand, star rating, lowest price, and a buy button. Accepts an optional `showOffers` prop to display the full retailer list inline.

```astro
---
import { getCollection } from 'astro:content'
import ProductCard from 'astro-shopsavvy/components/ProductCard.astro'

const products = await getCollection('products')
---

<div class="product-grid">
  {products.map(p => (
    <ProductCard product={p.data} />
  ))}
</div>
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `ProductEntry` | required | Product data from the collection or loader |
| `href` | `string` | best offer URL | Override the card link |
| `showOffers` | `boolean` | `false` | Show inline retailer list below the price |
| `class` | `string` | — | Additional CSS class(es) |

### `<PriceComparisonTable />`

Server-rendered table of all available offers sorted by price. In-stock offers appear first; out-of-stock rows are dimmed.

```astro
---
import { getEntry } from 'astro:content'
import PriceComparisonTable from 'astro-shopsavvy/components/PriceComparisonTable.astro'

const product = await getEntry('products', 'B09XS7JWHH')
---

<PriceComparisonTable product={product.data} showOutOfStock={false} />
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `ProductEntry` | required | Product data |
| `limit` | `number` | all | Maximum rows to display |
| `showOutOfStock` | `boolean` | `true` | Include out-of-stock offers as dimmed rows |
| `class` | `string` | — | Additional CSS class(es) |

### `<DealFeed />` — client island

Interactive deal feed with hot / new / top-of-the-day sort and load-more pagination. Hydrates when the component enters the viewport (`client:visible`). Fetches deals from your own API route, not directly from ShopSavvy — so your API key stays server-side.

```astro
---
import DealFeed from 'astro-shopsavvy/components/DealFeed.astro'
---

<DealFeed client:visible apiBase="/api/shopsavvy" limit={20} sort="hot" />
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBase` | `string` | `/api/shopsavvy` | Base path for your API route |
| `limit` | `number` | `20` | Deals per page |
| `sort` | `'hot' \| 'new' \| 'top-hour' \| 'top-day' \| 'top-week'` | `'hot'` | Initial sort order |
| `category` | `string` | — | Filter to a category slug |
| `class` | `string` | — | Additional CSS class(es) |

Requires the [API endpoint template](#api-endpoint-template) below.

### `<PriceHistory />` — client island

Line chart of historical prices across retailers, powered by Chart.js. Hydrates on page load (`client:load`). Chart.js is loaded from CDN by default; override `chartJsSrc` to self-host.

```astro
---
import PriceHistory from 'astro-shopsavvy/components/PriceHistory.astro'
---

<PriceHistory client:load identifier="B09XS7JWHH" days={90} apiBase="/api/shopsavvy" />
```

Props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `identifier` | `string` | required | Product identifier (ASIN, UPC, barcode, URL, etc.) |
| `days` | `number` | `90` | Days of history to display |
| `apiBase` | `string` | `/api/shopsavvy` | Base path for your API route |
| `chartJsSrc` | `string` | jsDelivr CDN | Chart.js script URL |
| `height` | `number` | `300` | Canvas height in pixels |
| `class` | `string` | — | Additional CSS class(es) |

## API Endpoint Template

Create `src/pages/api/shopsavvy/[...slug].ts` to proxy requests through your server (keeps your API key out of the browser):

```ts
import type { APIRoute } from 'astro'
import { handleShopSavvyRequest } from 'astro-shopsavvy'

export const GET: APIRoute = (context) => handleShopSavvyRequest(context)
```

The handler reads `context.locals.shopsavvy` (injected by the integration middleware) and routes requests automatically:

| Route | Description |
|-------|-------------|
| `GET /api/shopsavvy/search?q=...&limit=10` | Product search |
| `GET /api/shopsavvy/products/:id` | Product details |
| `GET /api/shopsavvy/products/:id/offers` | Current prices across retailers |
| `GET /api/shopsavvy/products/:id/history?days=90` | Price history (or `?start=YYYY-MM-DD&end=YYYY-MM-DD`) |
| `GET /api/shopsavvy/deals?sort=hot&limit=20&category=electronics` | Deals feed (`sort`: hot, new, top-hour, top-day, top-week) |

## Middleware

The `shopsavvy()` integration registers middleware automatically that injects a configured API client into `Astro.locals.shopsavvy`. Use it in any `.astro` page or API endpoint:

```astro
---
// src/pages/products/[id].astro
const { shopsavvy } = Astro.locals
const result = await shopsavvy.getProductDetails(Astro.params.id)
const product = result?.data?.[0]
---
```

## RSS Feed (with @astrojs/rss)

Export a deals feed using `@astrojs/rss`:

```ts
// src/pages/deals.xml.ts
import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { createClient, dealsToRssItems } from 'astro-shopsavvy'

export const GET: APIRoute = async (context) => {
  const client = createClient({ apiKey: import.meta.env.SHOPSAVVY_API_KEY })
  const response = await client.getDeals({ sort: 'hot', limit: 50 })

  return rss({
    title: 'Hot Deals',
    description: 'Top shopping deals right now',
    site: context.site!,
    items: dealsToRssItems(response.deals ?? [], context.site!.toString()),
  })
}
```

Export a product feed:

```ts
import rss from '@astrojs/rss'
import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { productToRssItem } from 'astro-shopsavvy'

export const GET: APIRoute = async (context) => {
  const products = await getCollection('products')

  return rss({
    title: 'Product Prices',
    description: 'Latest prices from ShopSavvy',
    site: context.site!,
    items: products.map(p => productToRssItem(p.data, '/products', context.site!.toString())),
  })
}
```

## Sitemap (with @astrojs/sitemap)

`@astrojs/sitemap` auto-discovers all static pages. To include dynamic product pages, generate them as static routes:

```astro
---
// src/pages/products/[id].astro
import { getCollection } from 'astro:content'

export async function getStaticPaths() {
  const products = await getCollection('products')
  return products.map(p => ({
    params: { id: p.id },
    props: { product: p.data },
  }))
}
---
```

`@astrojs/sitemap` picks these up automatically when `site` is set in `astro.config.mjs`.

---

## Use Case Patterns

### Affiliate Review Blog

Fetch product details at build time, render a `ProductCard` and `PriceComparisonTable` on each review page, and embed a `PriceHistory` island for context:

```astro
---
// src/pages/reviews/[slug].astro
import { getEntry } from 'astro:content'
import ProductCard from 'astro-shopsavvy/components/ProductCard.astro'
import PriceComparisonTable from 'astro-shopsavvy/components/PriceComparisonTable.astro'
import PriceHistory from 'astro-shopsavvy/components/PriceHistory.astro'

const product = await getEntry('products', Astro.params.slug)
---

<ProductCard product={product.data} showOffers />
<PriceComparisonTable product={product.data} />
<PriceHistory client:load identifier={product.data.amazon ?? product.id} days={180} />
```

### Gift Guide Site

Build gift guides using static product grids. Query multiple search terms in the loader and group products by category on the page:

```ts
// src/content.config.ts
export const collections = {
  'gift-tech': defineCollection({
    loader: shopsavvyLoader({
      queries: ['best headphones 2025', 'best laptop 2025', 'best smartwatch 2025'],
      includeOffers: true,
    }),
    schema: ShopSavvySchema,
  }),
}
```

```astro
---
import { getCollection } from 'astro:content'
import ProductCard from 'astro-shopsavvy/components/ProductCard.astro'

const products = await getCollection('gift-tech')
---

<div class="gift-grid">
  {products.map(p => <ProductCard product={p.data} />)}
</div>
```

### Deal Aggregator

Use the `DealFeed` island as the homepage centrepiece, backed by the API endpoint:

```astro
---
// src/pages/index.astro
import DealFeed from 'astro-shopsavvy/components/DealFeed.astro'
---

<main>
  <h1>Today's Best Deals</h1>
  <DealFeed client:visible apiBase="/api/shopsavvy" limit={30} sort="hot" />
</main>
```

Combine with the RSS helper to publish a syndicated deals feed at `/deals.xml`.

---

## Deployment

This integration works on every Astro adapter. The middleware and API endpoint helpers run in server mode; the Content Collection loader runs at build time.

| Platform | Adapter | Notes |
|----------|---------|-------|
| Vercel | `@astrojs/vercel` | Works with both static and SSR output modes |
| Netlify | `@astrojs/netlify` | Edge and Node.js runtimes both supported |
| Cloudflare | `@astrojs/cloudflare` | Set `SHOPSAVVY_API_KEY` at build time (Astro inlines `import.meta.env` into the server build) or pass `{ apiKey }` |
| Node.js | `@astrojs/node` | Set `SHOPSAVVY_API_KEY` in your process environment |

For static-only sites (`output: 'static'`), the middleware and API routes are not available — use the Content Collection loader and build-time data fetching only.

---

## TypeScript

All types are exported from the package root:

```ts
import type {
  ProductEntry,
  ProductOffer,
  PriceHistoryPoint,
  DealEntry,
  ShopSavvyProduct,
  ShopSavvyDeal,
  ShopSavvyIntegrationOptions,
  ShopSavvyLocals,
} from 'astro-shopsavvy'
```

Augment `Astro.locals` with the injected client type in `src/env.d.ts`:

```ts
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    shopsavvy: import('astro-shopsavvy').ShopSavvyLocals['shopsavvy']
  }
}
```

---

## Links

- [ShopSavvy Astro integration page](https://shopsavvy.com/integrations/astro)
- [ShopSavvy Data API](https://shopsavvy.com/data)
- [API Documentation](https://shopsavvy.com/data/documentation)

## License

MIT
