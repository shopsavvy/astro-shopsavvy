/**
 * Runs handleShopSavvyRequest with the REAL @shopsavvy/sdk client against a local
 * HTTP server standing in for api.shopsavvy.com, and checks the exact request the
 * Data API receives for each route.
 * Run with: bun run tests/test-handlers.ts
 */

import { handleShopSavvyRequest } from "../src/endpoints/handlers.ts"
import { createClient } from "../src/client.ts"
import { createServer, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

type Seen = { path: string; params: Record<string, string>; auth: string | null }
const seen: Seen[] = []

function respond(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" })
  res.end(JSON.stringify(body))
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1")
  seen.push({ path: url.pathname, params: Object.fromEntries(url.searchParams), auth: req.headers.authorization ?? null })
  if (url.pathname === "/v1/deals") {
    return respond(res, 200, { success: true, deals: [], pagination: { total: 0, has_more: false, limit: 20, offset: 0 } })
  }
  if (url.pathname === "/v1/products/offers/history") {
    // The real shape: one entry per product, each offer carrying its own history (newest first).
    return respond(res, 200, {
      success: true,
      data: [{
        title: "Sony WH-1000XM5",
        shopsavvy: "abc123",
        category: null,
        offers: [{
          id: "o1",
          retailer: "Amazon",
          price: 10,
          currency: "USD",
          seller: null,
          history: [
            { timestamp: "2026-01-02T00:00:00Z", price: 10, currency: "USD", availability: "in" },
            { timestamp: "2026-01-01T00:00:00Z", price: 12, currency: null },
          ],
        }],
      }],
    })
  }
  if (url.searchParams.get("ids") === "bad") {
    return respond(res, 404, { success: false, error: "Product not found" })
  }
  return respond(res, 200, { success: true, data: [], pagination: { total: 0, limit: 10, offset: 0, returned: 0 } })
})
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const port = (server.address() as AddressInfo).port

const apiKey = "ss_test_handlers123"
const client = createClient({ apiKey, baseUrl: `http://127.0.0.1:${port}/v1` })

async function call(path: string, withClient = true) {
  seen.length = 0
  const url = new URL(`http://site.test/api/shopsavvy/${path}`)
  const slug = url.pathname.replace("/api/shopsavvy/", "")
  const context = {
    request: new Request(url),
    params: { slug },
    locals: withClient ? { shopsavvy: client } : {},
  } as any
  const res = await handleShopSavvyRequest(context)
  return { res, body: await res.json() as any }
}

try {
  {
    const { res } = await call("search?q=sony&limit=5&offset=10")
    assert(res.status === 200, "search returns 200")
    assert(seen[0]?.path === "/v1/products/search", "search hits /products/search")
    assert(JSON.stringify(seen[0].params) === JSON.stringify({ q: "sony", limit: "5", offset: "10" }), "search forwards q/limit/offset")
    assert(seen[0].auth === `Bearer ${apiKey}`, "search sends the bearer key")
  }
  {
    await call("search?q=sony&limit=abc")
    assert(seen[0].params.limit === "10", "non-numeric limit falls back to the default instead of NaN")
  }
  {
    const { res } = await call("search")
    assert(res.status === 400, "search without q is a 400")
  }
  {
    await call("products/B09XS7JWHH/offers?retailer=amazon.com")
    assert(seen[0].path === "/v1/products/offers", "offers hits /products/offers")
    assert(seen[0].params.ids === "B09XS7JWHH" && seen[0].params.retailer === "amazon.com", "offers forwards ids + retailer")
  }
  {
    const { res, body } = await call("products/B09XS7JWHH/history?start=2026-01-01&end=2026-01-31")
    assert(res.status === 200, "history returns 200")
    assert(seen[0].path === "/v1/products/offers/history", "history hits /products/offers/history")
    assert(
      JSON.stringify(seen[0].params) === JSON.stringify({ ids: "B09XS7JWHH", start: "2026-01-01", end: "2026-01-31" }),
      "history sends ids/start/end"
    )
    assert(body.data[0].shopsavvy === "abc123", "history passes the per-product entries through")
    assert(body.data[0].offers[0].history[0].timestamp === "2026-01-02T00:00:00Z", "history passes each offer's history[] through")
    assert(body.data[0].offers[0].history[1].currency === null, "a null-currency point survives the round trip")
  }
  {
    await call("products/B09XS7JWHH/history?days=7")
    const { start, end } = seen[0].params
    const spanDays = (Date.parse(end) - Date.parse(start)) / 86_400_000
    assert(/^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end), "days is converted to YYYY-MM-DD start/end")
    assert(spanDays === 7, "days=7 spans 7 days")
  }
  {
    const { res } = await call("products/B09XS7JWHH/history?start=01/01/2026")
    assert(res.status === 400, "malformed start date is a 400")
  }
  {
    await call("deals?sort=top-week&limit=5&category=electronics")
    assert(seen[0].path === "/v1/deals", "deals hits /deals")
    assert(seen[0].params.sort === "top-week" && seen[0].params.category === "electronics", "deals forwards sort + category")
  }
  {
    const { res } = await call("deals?sort=top")
    assert(res.status === 400 && seen.length === 0, "invalid sort is rejected before calling the API")
  }
  {
    const { res, body } = await call("products/bad")
    assert(res.status === 502 && body.error === "Product not found", "a Data API error comes back as JSON with its message")
  }
  {
    const { res, body } = await call("products/bad-thing/nope")
    assert(res.status === 404 && typeof body.error === "string", "unknown route is a JSON 404")
  }
  {
    const { res, body } = await call("search?q=x", false)
    assert(res.status === 500 && body.error.includes("SHOPSAVVY_API_KEY"), "missing client explains how to configure the key")
  }
  console.log("\nAll handler tests passed.")
} finally {
  server.close()
}
