/**
 * astro-shopsavvy
 *
 * Astro integration for ShopSavvy product search, price comparison,
 * and deal discovery. Provides:
 *
 *   - shopsavvy()        — Astro integration (astro.config.mjs)
 *   - shopsavvyLoader    — Content Collection loader (Astro 5)
 *   - ShopSavvySchema    — Zod schema for product entries
 *   - createClient       — Direct API client for pages/endpoints
 *   - handleShopSavvyRequest — Catch-all API route handler
 *   - dealsToRssItems    — @astrojs/rss helpers
 *   - productToRssItem   — @astrojs/rss helpers
 *
 * @see https://shopsavvy.com/integrations/astro
 */

export { createShopSavvyIntegration as shopsavvy } from "./integration.ts"
export { shopsavvyLoader } from "./loaders/products.ts"
export { ShopSavvySchema, DealSchema } from "./schema.ts"
export { createClient } from "./client.ts"
export { handleShopSavvyRequest } from "./endpoints/handlers.ts"
export { dealsToRssItems, productToRssItem } from "./rss.ts"

export type {
  ShopSavvyIntegrationOptions,
  ShopSavvyLocals,
  ProductEntry,
  ProductOffer,
  PriceHistoryPoint,
  DealEntry,
} from "./types.ts"

export type { ShopSavvyProduct, ShopSavvyDeal } from "./schema.ts"
export type { ShopSavvyLoaderOptions } from "./loaders/products.ts"
export type { RssItem } from "./rss.ts"
