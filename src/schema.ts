/**
 * astro-shopsavvy — Zod schemas for product data validation
 *
 * Use ShopSavvySchema with Astro 5 Content Collections:
 *
 *   import { defineCollection } from 'astro:content'
 *   import { shopsavvyLoader } from 'astro-shopsavvy'
 *   import { ShopSavvySchema } from 'astro-shopsavvy'
 *
 *   export const collections = {
 *     products: defineCollection({
 *       loader: shopsavvyLoader({ queries: ['airpods pro'] }),
 *       schema: ShopSavvySchema,
 *     }),
 *   }
 */

// Astro's own zod (zod 3 in Astro 5, zod 4 in Astro 6+). Content collection schemas
// must come from the same zod the host Astro uses, or Astro cannot introspect them
// (Astro 7 fails to generate the collection's JSON schema for a zod 3 object).
// Only APIs present in both zod 3 and zod 4 are used below.
import { z } from "astro/zod"

export const ProductOfferSchema = z.object({
  retailer: z.string(),
  price: z.number(),
  currency: z.string().default("USD"),
  url: z.string().url(),
  in_stock: z.boolean(),
  shipping: z.string().optional(),
  condition: z.string().optional(),
})

export const PriceHistoryPointSchema = z.object({
  date: z.string(),
  price: z.number(),
  retailer: z.string(),
})

export const ProductRatingSchema = z.object({
  value: z.number().min(0).max(5),
  count: z.number().int().nonnegative(),
})

export const ProductScoreSchema = z.object({
  overall: z.number().optional(),
  customer: z.number().optional(),
  professional: z.number().optional(),
  value: z.number().optional(),
  features: z.number().optional(),
  reliability: z.number().optional(),
  /** Per-aspect expert scores keyed by free-form aspect name (0-1 scale). */
  aspects: z.record(z.string(), z.number()).optional(),
})

export const DealGradeSchema = z.object({
  letter: z.string(),
  suffix: z.string().optional(),
  value: z.number(),
  justification: z.string().optional(),
})

export const DealPricingSchema = z.object({
  current: z.number(),
  original: z.number().optional(),
  currency: z.string().default("USD"),
})

export const DealTagSchema = z.object({
  slug: z.string(),
  display: z.string(),
})

/** Full Zod schema for a product entry in a Content Collection. */
export const ShopSavvySchema = z.object({
  id: z.string(),
  title: z.string(),
  title_short: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  images: z.array(z.string().url()).default([]),
  barcode: z.string().optional(),
  amazon: z.string().optional(),
  model: z.string().optional(),
  mpn: z.string().optional(),
  slug: z.string().optional(),
  rating: ProductRatingSchema.optional(),
  score: ProductScoreSchema.optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  offers: z.array(ProductOfferSchema).default([]),
  lowest_price: z.number().optional(),
  highest_price: z.number().optional(),
  price_currency: z.string().optional(),
  fetched_at: z.string(),
})

/** Zod schema for a deal entry. */
export const DealSchema = z.object({
  path: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  grade: DealGradeSchema,
  pricing: DealPricingSchema,
  retailer: z.object({ name: z.string() }),
  url: z.string().url(),
  image: z.object({ url: z.string().url() }).optional(),
  votes: z.object({
    upvotes: z.number().int(),
    downvotes: z.number().int(),
    score: z.number(),
  }),
  comment_count: z.number().int(),
  tags: z.array(DealTagSchema).optional(),
  created_at: z.string(),
  expires_at: z.string().optional(),
})

export type ShopSavvyProduct = z.infer<typeof ShopSavvySchema>
export type ShopSavvyDeal = z.infer<typeof DealSchema>
export type ProductOffer = z.infer<typeof ProductOfferSchema>
export type PriceHistoryPoint = z.infer<typeof PriceHistoryPointSchema>
