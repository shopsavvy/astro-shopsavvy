/**
 * astro-shopsavvy — API endpoint helpers
 *
 * Drop these into a catch-all route at src/pages/api/shopsavvy/[...slug].ts:
 *
 *   import type { APIRoute } from 'astro'
 *   import { handleShopSavvyRequest } from 'astro-shopsavvy'
 *
 *   export const GET: APIRoute = ({ params, request, locals }) =>
 *     handleShopSavvyRequest({ params, request, locals })
 *
 * Supported URL patterns (relative to wherever you mount this route):
 *
 *   GET /api/shopsavvy/search?q=airpods+pro&limit=10
 *   GET /api/shopsavvy/products/:identifier
 *   GET /api/shopsavvy/products/:identifier/offers
 *   GET /api/shopsavvy/products/:identifier/history?days=90  (or ?start=YYYY-MM-DD&end=YYYY-MM-DD)
 *   GET /api/shopsavvy/deals?sort=hot&limit=20&category=electronics
 */

import type { APIContext } from "astro"
import type { ShopSavvyClient } from "../client.ts"

const DEAL_SORTS = ["hot", "new", "top-hour", "top-day", "top-week"] as const
type DealSort = (typeof DEAL_SORTS)[number]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function handleShopSavvyRequest(context: APIContext): Promise<Response> {
  const client = (context.locals as { shopsavvy?: ShopSavvyClient }).shopsavvy
  if (!client) {
    return jsonError(
      "ShopSavvy client not found in locals. Make sure the shopsavvy() integration is registered in astro.config.mjs " +
        "and SHOPSAVVY_API_KEY is set (or pass { apiKey } to shopsavvy()).",
      500
    )
  }

  const url = new URL(context.request.url)
  const slug = (context.params.slug ?? "").split("/").filter(Boolean)

  try {
    // GET /search?q=...
    if (slug[0] === "search" || slug.length === 0) {
      const q = url.searchParams.get("q")
      if (!q) return jsonError("Missing query parameter: q", 400)
      const limit = intParam(url, "limit", 10)
      const offset = intParam(url, "offset", 0)
      const result = await client.searchProducts(q, { limit, offset })
      return json(result)
    }

    // GET /products/:identifier
    if (slug[0] === "products" && slug.length === 2) {
      const result = await client.getProductDetails(slug[1])
      return json(result)
    }

    // GET /products/:identifier/offers
    if (slug[0] === "products" && slug.length === 3 && slug[2] === "offers") {
      const retailer = url.searchParams.get("retailer") ?? undefined
      const result = await client.getCurrentOffers(slug[1], retailer ? { retailer } : undefined)
      return json(result)
    }

    // GET /products/:identifier/history?days=90  or  ?start=YYYY-MM-DD&end=YYYY-MM-DD
    // The Data API takes an explicit start/end range; `days` is converted here.
    if (slug[0] === "products" && slug.length === 3 && slug[2] === "history") {
      const retailer = url.searchParams.get("retailer") ?? undefined
      const start = url.searchParams.get("start")
      const end = url.searchParams.get("end")
      if ((start && !ISO_DATE.test(start)) || (end && !ISO_DATE.test(end))) {
        return jsonError("start and end must be dates in YYYY-MM-DD format", 400)
      }
      const days = intParam(url, "days", 30)
      const endDate = end ?? new Date().toISOString().slice(0, 10)
      const startDate = start ?? new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
      const result = await client.getPriceHistory(slug[1], startDate, endDate, retailer ? { retailer } : undefined)
      return json(result)
    }

    // GET /deals
    if (slug[0] === "deals") {
      const sort = url.searchParams.get("sort") ?? "hot"
      if (!DEAL_SORTS.includes(sort as DealSort)) {
        return jsonError(`sort must be one of: ${DEAL_SORTS.join(", ")}`, 400)
      }
      const limit = intParam(url, "limit", 20)
      const offset = intParam(url, "offset", 0)
      const category = url.searchParams.get("category") ?? undefined
      const grade = url.searchParams.get("grade") ?? undefined
      const result = await client.getDeals({ sort: sort as DealSort, limit, offset, category, grade })
      return json(result)
    }
  } catch (err) {
    // The SDK throws with the Data API's own error message (bad identifier,
    // invalid params, auth); surface it as JSON instead of an HTML 500 page.
    return jsonError(err instanceof Error ? err.message : String(err), 502)
  }

  return jsonError(`Unknown route: /${slug.join("/")}`, 404)
}

/** A non-negative integer query param, or the fallback when absent/non-numeric. */
function intParam(url: URL, name: string, fallback: number): number {
  const parsed = parseInt(url.searchParams.get(name) ?? "", 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status)
}
