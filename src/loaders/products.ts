/**
 * astro-shopsavvy — Astro 5 Content Loader
 *
 * Fetches product data from the ShopSavvy API at build time and returns
 * typed entries compatible with Astro Content Collections.
 *
 * Usage in src/content.config.ts:
 *
 *   import { defineCollection } from 'astro:content'
 *   import { shopsavvyLoader } from 'astro-shopsavvy'
 *   import { ShopSavvySchema } from 'astro-shopsavvy'
 *
 *   export const collections = {
 *     products: defineCollection({
 *       loader: shopsavvyLoader({
 *         queries: ['airpods pro', 'samsung 4k tv'],
 *         identifiers: ['B09XS7JWHH', '012345678901'],
 *         includeOffers: true,
 *       }),
 *       schema: ShopSavvySchema,
 *     }),
 *   }
 */

import type { Loader, LoaderContext } from "astro/loaders"
import { createClient } from "../client.ts"
import type { ProductEntry, ProductOffer } from "../types.ts"
import type { ShopSavvyIntegrationOptions } from "../types.ts"

export interface ShopSavvyLoaderOptions extends ShopSavvyIntegrationOptions {
  /**
   * Free-text search queries. The loader runs each query and collects all
   * returned products.
   */
  queries?: string[]
  /**
   * Direct product lookups by barcode, UPC, EAN, ISBN, ASIN, URL, model
   * number, or MPN.
   */
  identifiers?: string[]
  /**
   * Fetch current offers (prices) for each product.
   * @default true
   */
  includeOffers?: boolean
  /**
   * Maximum products returned per search query.
   * @default 20
   */
  limit?: number
}

/**
 * Build-time content loader that fetches ShopSavvy product data.
 *
 * Products are keyed by their ShopSavvy product ID so Astro can cache and
 * incrementally refresh entries across builds.
 */
export function shopsavvyLoader(options: ShopSavvyLoaderOptions = {}): Loader {
  const { queries = [], identifiers = [], includeOffers = true, limit = 20, ...clientOptions } = options

  return {
    name: "shopsavvy-loader",

    async load({ store, logger, parseData }: LoaderContext) {
      const client = createClient(clientOptions)
      const fetchedAt = new Date().toISOString()
      let loaded = 0

      // ── Collect raw product details from search queries ──
      for (const query of queries) {
        logger.info(`astro-shopsavvy: searching "${query}"`)

        const searchResult = await client.searchProducts(query, { limit })
        const products = searchResult?.data ?? []

        for (const rawProduct of products) {
          const id = rawProduct.shopsavvy ?? rawProduct.product_id
          if (!id) continue

          const offers = includeOffers ? await fetchOffers(client, id, logger) : []

          const entry = buildProductEntry(rawProduct, offers, fetchedAt)
          const parsed = await parseData({ id, data: entry as unknown as Record<string, unknown> })
          store.set({ id, data: parsed })
          loaded++
        }
      }

      // ── Direct identifier lookups ──
      for (const identifier of identifiers) {
        logger.info(`astro-shopsavvy: fetching product "${identifier}"`)

        const detailsResult = await client.getProductDetails(identifier)
        const products = detailsResult?.data ?? []

        for (const rawProduct of products) {
          const id = rawProduct.shopsavvy ?? rawProduct.product_id
          if (!id) continue

          const offers = includeOffers ? await fetchOffers(client, id, logger) : []

          const entry = buildProductEntry(rawProduct, offers, fetchedAt)
          const parsed = await parseData({ id, data: entry as unknown as Record<string, unknown> })
          store.set({ id, data: parsed })
          loaded++
        }
      }

      logger.info(`astro-shopsavvy: loaded ${loaded} products`)
    },
  }
}

async function fetchOffers(
  client: ReturnType<typeof createClient>,
  id: string,
  logger: LoaderContext["logger"]
): Promise<ProductOffer[]> {
  try {
    const offersResult = await client.getCurrentOffers(id)
    const rawOffers = offersResult?.data?.[0]?.offers ?? []
    // Data API offer shape: { id, retailer, price, currency, availability: "in" | "out"
    // (absent when unknown), condition, URL, seller, timestamp }.
    return rawOffers.map((o: any): ProductOffer => ({
      retailer: o.retailer ?? "",
      price: Number(o.price ?? 0),
      currency: o.currency ?? "USD",
      url: o.URL ?? "",
      in_stock: o.availability !== "out",
      condition: o.condition,
    }))
  } catch (err: any) {
    logger.warn(`astro-shopsavvy: could not fetch offers for ${id}: ${err.message}`)
    return []
  }
}

function buildProductEntry(rawProduct: any, offers: ProductOffer[], fetchedAt: string): ProductEntry {
  const prices = offers.map((o) => o.price).filter((p) => p > 0)

  return {
    id: rawProduct.shopsavvy ?? rawProduct.product_id ?? "",
    title: rawProduct.title ?? rawProduct.name ?? "",
    title_short: rawProduct.title_short,
    brand: rawProduct.brand,
    category: rawProduct.category,
    description: rawProduct.description,
    images: rawProduct.images ?? (rawProduct.image_url ? [rawProduct.image_url] : []),
    barcode: rawProduct.barcode,
    amazon: rawProduct.amazon ?? rawProduct.asin,
    model: rawProduct.model,
    mpn: rawProduct.mpn,
    slug: rawProduct.slug,
    rating: rawProduct.rating,
    score: rawProduct.score,
    attributes: rawProduct.attributes,
    keywords: rawProduct.keywords,
    offers,
    lowest_price: prices.length ? Math.min(...prices) : undefined,
    highest_price: prices.length ? Math.max(...prices) : undefined,
    price_currency: offers[0]?.currency,
    fetched_at: fetchedAt,
  }
}
