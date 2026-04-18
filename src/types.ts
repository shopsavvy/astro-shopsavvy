/**
 * astro-shopsavvy — shared TypeScript types
 */

export interface ShopSavvyIntegrationOptions {
  /** Your ShopSavvy API key. Defaults to SHOPSAVVY_API_KEY env var. */
  apiKey?: string
  /**
   * Override the ShopSavvy API base URL. Useful for proxying requests
   * through your own server instead of calling the API directly from
   * client-side components.
   */
  baseUrl?: string
  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeout?: number
}

/** Context injected into Astro's `locals` by the middleware. */
export interface ShopSavvyLocals {
  shopsavvy: import("./client.ts").ShopSavvyClient
}

/** A single price offer from one retailer. */
export interface ProductOffer {
  retailer: string
  price: number
  currency: string
  url: string
  in_stock: boolean
  shipping?: string
  condition?: string
}

/** A single data point in a product's price history. */
export interface PriceHistoryPoint {
  date: string
  price: number
  retailer: string
}

/** Normalised product entry as stored in Content Collections. */
export interface ProductEntry {
  id: string
  title: string
  title_short?: string
  brand?: string
  category?: string
  description?: string
  images: string[]
  barcode?: string
  amazon?: string
  model?: string
  mpn?: string
  slug?: string
  rating?: { value: number; count: number }
  score?: {
    overall?: number
    customer?: number
    professional?: number
    value?: number
    features?: number
    reliability?: number
  }
  attributes?: Record<string, string>
  keywords?: string[]
  offers: ProductOffer[]
  lowest_price?: number
  highest_price?: number
  price_currency?: string
  fetched_at: string
}

/** A single deal entry. */
export interface DealEntry {
  path: string
  title: string
  subtitle?: string
  description?: string
  emoji?: string
  grade: {
    letter: string
    suffix?: string
    value: number
    justification?: string
  }
  pricing: {
    current: number
    original?: number
    currency: string
  }
  retailer: { name: string }
  url: string
  image?: { url: string }
  votes: { upvotes: number; downvotes: number; score: number }
  comment_count: number
  tags?: { slug: string; display: string }[]
  created_at: string
  expires_at?: string
}
