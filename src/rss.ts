/**
 * astro-shopsavvy — @astrojs/rss helpers
 *
 * Build RSS feed items from ShopSavvy deals or products for use with
 * @astrojs/rss's `items` array.
 *
 * Usage in src/pages/deals.xml.ts:
 *
 *   import rss from '@astrojs/rss'
 *   import { createClient } from 'astro-shopsavvy'
 *   import { dealsToRssItems, productToRssItem } from 'astro-shopsavvy/rss'
 *
 *   export async function GET(context) {
 *     const client = createClient({ apiKey: import.meta.env.SHOPSAVVY_API_KEY })
 *     const { deals } = await client.getDeals({ sort: 'hot', limit: 50 })
 *
 *     return rss({
 *       title: 'Hot Deals',
 *       description: 'Top shopping deals right now',
 *       site: context.site,
 *       items: dealsToRssItems(deals, context.site?.toString() ?? ''),
 *     })
 *   }
 */

import type { DealEntry, ProductEntry } from "./types.ts"

export interface RssItem {
  title: string
  link: string
  pubDate: Date
  description: string
  categories?: string[]
}

/**
 * Convert an array of ShopSavvy deals to @astrojs/rss-compatible item objects.
 *
 * @param deals - Array of DealEntry objects from the API or content collection
 * @param siteBase - Your site's base URL (e.g. "https://mysite.com") for
 *   building absolute internal links
 */
export function dealsToRssItems(deals: DealEntry[], siteBase: string): RssItem[] {
  return deals.map((deal) => {
    const savings =
      deal.pricing.original && deal.pricing.original > deal.pricing.current
        ? ` (${formatSavings(deal.pricing.original, deal.pricing.current, deal.pricing.currency)} off)`
        : ""

    const description =
      `${deal.grade.letter} deal at ${deal.retailer.name} — ` +
      `${formatPrice(deal.pricing.current, deal.pricing.currency)}${savings}. ` +
      (deal.description ?? deal.subtitle ?? "")

    return {
      title: `${deal.emoji ? deal.emoji + " " : ""}${deal.title}`,
      link: siteBase.replace(/\/$/, "") + `/deals/${deal.path}`,
      pubDate: new Date(deal.created_at),
      description: description.trim(),
      categories: deal.tags?.map((t) => t.display),
    }
  })
}

/**
 * Convert a ShopSavvy product to a @astrojs/rss-compatible item object.
 *
 * @param product - ProductEntry from the content collection or loader
 * @param pathPrefix - URL path prefix for the product page (e.g. "/products")
 * @param siteBase - Your site's base URL
 */
export function productToRssItem(product: ProductEntry, pathPrefix: string, siteBase: string): RssItem {
  const slug = product.slug ?? product.id
  const lowestOffer = product.offers.find((o) => o.price === product.lowest_price)

  const pricePart = product.lowest_price
    ? ` from ${formatPrice(product.lowest_price, product.price_currency ?? "USD")}`
    : ""

  const retailerPart = lowestOffer ? ` at ${lowestOffer.retailer}` : ""

  const description =
    (product.description ?? `${product.title} — compare prices across retailers.`) +
    (pricePart ? ` Available${pricePart}${retailerPart}.` : "")

  return {
    title: product.title,
    link: `${siteBase.replace(/\/$/, "")}${pathPrefix}/${slug}`,
    pubDate: new Date(product.fetched_at),
    description,
    categories: product.category ? [product.category] : undefined,
  }
}

function formatPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price)
  } catch {
    return `${currency} ${price.toFixed(2)}`
  }
}

function formatSavings(original: number, current: number, currency: string): string {
  return formatPrice(original - current, currency)
}
