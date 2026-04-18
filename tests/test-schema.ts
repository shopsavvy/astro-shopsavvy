/**
 * Tests that Zod schemas accept valid data and reject invalid data.
 * Run with: bun run tests/test-schema.ts
 */

import { ShopSavvySchema, DealSchema, ProductOfferSchema } from "../src/schema.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

function expectValid(schema: { safeParse: (v: unknown) => { success: boolean } }, data: unknown, label: string) {
  const result = schema.safeParse(data)
  assert(result.success, `${label} — valid data accepted`)
}

function expectInvalid(schema: { safeParse: (v: unknown) => { success: boolean } }, data: unknown, label: string) {
  const result = schema.safeParse(data)
  assert(!result.success, `${label} — invalid data rejected`)
}

// ── ProductOfferSchema ──

expectValid(ProductOfferSchema, {
  retailer: "Amazon",
  price: 199.99,
  currency: "USD",
  url: "https://amazon.com/dp/B09XS7JWHH",
  in_stock: true,
}, "ProductOffer")

expectInvalid(ProductOfferSchema, {
  retailer: "Amazon",
  price: 199.99,
  currency: "USD",
  url: "not-a-url",
  in_stock: true,
}, "ProductOffer with invalid URL")

// ── ShopSavvySchema (full product) ──

const validProduct = {
  id: "B09XS7JWHH",
  title: "Apple AirPods Pro (2nd generation)",
  title_short: "AirPods Pro 2",
  brand: "Apple",
  category: "Electronics",
  description: "Adaptive Audio. Now playing.",
  images: ["https://example.com/image.jpg"],
  barcode: "194253393788",
  amazon: "B09XS7JWHH",
  model: "MQTP3LL/A",
  rating: { value: 4.8, count: 12500 },
  score: { overall: 92 },
  attributes: { color: "White", connectivity: "Bluetooth" },
  keywords: ["airpods", "earbuds"],
  offers: [
    {
      retailer: "Amazon",
      price: 199.99,
      currency: "USD",
      url: "https://amazon.com/dp/B09XS7JWHH",
      in_stock: true,
      shipping: "Free",
    },
  ],
  lowest_price: 199.99,
  highest_price: 219.99,
  price_currency: "USD",
  fetched_at: new Date().toISOString(),
}

expectValid(ShopSavvySchema, validProduct, "ShopSavvySchema full product")

// Missing required fields
expectInvalid(ShopSavvySchema, { id: "x" }, "ShopSavvySchema missing required fields")

// Defaults
const minimal = ShopSavvySchema.parse({
  id: "abc",
  title: "Test Product",
  fetched_at: new Date().toISOString(),
})
assert(Array.isArray(minimal.images), "images defaults to array")
assert(Array.isArray(minimal.offers), "offers defaults to array")

// ── DealSchema ──

const validDeal = {
  path: "airpods-deal",
  title: "AirPods Pro Deal",
  grade: { letter: "A", value: 90 },
  pricing: { current: 149, original: 249, currency: "USD" },
  retailer: { name: "Best Buy" },
  url: "https://bestbuy.com/site/airpods",
  votes: { upvotes: 100, downvotes: 5, score: 95 },
  comment_count: 12,
  created_at: new Date().toISOString(),
}

expectValid(DealSchema, validDeal, "DealSchema valid deal")

// Missing grade
expectInvalid(DealSchema, { ...validDeal, grade: undefined }, "DealSchema missing grade")

// Bad URL
expectInvalid(DealSchema, { ...validDeal, url: "not-a-url" }, "DealSchema invalid URL")

console.log("\nAll schema tests passed.")
