/**
 * Tests that all expected exports are present and have the correct shape.
 * Run with: bun run tests/test-exports.ts
 */

import * as pkg from "../src/index.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

// Integration factory
assert(typeof pkg.shopsavvy === "function", "shopsavvy() is a function")

// Content loader factory
assert(typeof pkg.shopsavvyLoader === "function", "shopsavvyLoader() is a function")

// Zod schemas
assert(typeof pkg.ShopSavvySchema === "object" && pkg.ShopSavvySchema !== null, "ShopSavvySchema is exported")
assert(typeof pkg.DealSchema === "object" && pkg.DealSchema !== null, "DealSchema is exported")
assert(typeof (pkg.ShopSavvySchema as any).parse === "function", "ShopSavvySchema.parse() exists (is a Zod schema)")

// Client factory
assert(typeof pkg.createClient === "function", "createClient() is a function")

// API handler
assert(typeof pkg.handleShopSavvyRequest === "function", "handleShopSavvyRequest() is a function")

// RSS helpers
assert(typeof pkg.dealsToRssItems === "function", "dealsToRssItems() is a function")
assert(typeof pkg.productToRssItem === "function", "productToRssItem() is a function")

// Integration returns the correct shape
const integration = pkg.shopsavvy({ apiKey: "test_key" })
assert(integration.name === "astro-shopsavvy", "integration.name is 'astro-shopsavvy'")
assert(typeof integration.hooks === "object", "integration.hooks exists")
assert(typeof (integration.hooks as any)["astro:config:setup"] === "function", "astro:config:setup hook exists")

// Loader returns correct shape
const loader = pkg.shopsavvyLoader({ apiKey: "test_key", queries: ["airpods"] })
assert(loader.name === "shopsavvy-loader", "loader.name is 'shopsavvy-loader'")
assert(typeof loader.load === "function", "loader.load() is a function")

// createClient throws without API key
let threw = false
try {
  pkg.createClient({})
} catch (err: any) {
  threw = true
  assert(err.message.includes("https://shopsavvy.com/data"), "createClient error references shopsavvy.com/data")
}
assert(threw, "createClient throws without API key")

// RSS helpers return arrays / objects
const fakeDeals = [
  {
    path: "airpods-deal",
    title: "AirPods Pro",
    grade: { letter: "A", value: 90 },
    pricing: { current: 199, original: 249, currency: "USD" },
    retailer: { name: "Amazon" },
    url: "https://amazon.com/dp/B09XS7JWHH",
    votes: { upvotes: 50, downvotes: 2, score: 48 },
    comment_count: 5,
    created_at: new Date().toISOString(),
  },
]
const items = pkg.dealsToRssItems(fakeDeals as any, "https://mysite.com")
assert(Array.isArray(items), "dealsToRssItems returns array")
assert(items.length === 1, "dealsToRssItems returns correct count")
assert(typeof items[0].title === "string", "rss item has title")
assert(items[0].link.startsWith("https://mysite.com"), "rss item link is absolute")

const fakeProduct = {
  id: "B09XS7JWHH",
  title: "AirPods Pro",
  images: [],
  offers: [{ retailer: "Amazon", price: 199, currency: "USD", url: "https://amazon.com", in_stock: true }],
  lowest_price: 199,
  price_currency: "USD",
  fetched_at: new Date().toISOString(),
}
const productItem = pkg.productToRssItem(fakeProduct as any, "/products", "https://mysite.com")
assert(typeof productItem.title === "string", "productToRssItem returns item with title")
assert(productItem.link.includes("/products/"), "productToRssItem returns item with link")

console.log("\nAll export tests passed.")
