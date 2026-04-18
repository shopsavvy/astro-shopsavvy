/**
 * astro-shopsavvy — API endpoint helpers
 *
 * Drop these into a catch-all route at src/pages/api/shopsavvy/[...slug].ts:
 *
 *   import type { APIRoute } from 'astro'
 *   import { handleShopSavvyRequest } from 'astro-shopsavvy/endpoints'
 *
 *   export const GET: APIRoute = ({ params, request, locals }) =>
 *     handleShopSavvyRequest({ params, request, locals })
 *
 * Supported URL patterns (relative to wherever you mount this route):
 *
 *   GET /api/shopsavvy/search?q=airpods+pro&limit=10
 *   GET /api/shopsavvy/products/:identifier
 *   GET /api/shopsavvy/products/:identifier/offers
 *   GET /api/shopsavvy/products/:identifier/history
 *   GET /api/shopsavvy/deals?sort=hot&limit=20&category=electronics
 */

import type { APIContext } from "astro"

export async function handleShopSavvyRequest(context: APIContext): Promise<Response> {
  // @ts-expect-error: locals augmented at runtime by integration middleware
  const client = context.locals.shopsavvy
  if (!client) {
    return jsonError("ShopSavvy client not found in locals. Make sure the shopsavvy() integration is registered in astro.config.mjs.", 500)
  }

  const url = new URL(context.request.url)
  const slug = (context.params.slug ?? "").split("/").filter(Boolean)

  // GET /search?q=...
  if (slug[0] === "search" || slug.length === 0) {
    const q = url.searchParams.get("q")
    if (!q) return jsonError("Missing query parameter: q", 400)
    const limit = parseInt(url.searchParams.get("limit") ?? "10")
    const offset = parseInt(url.searchParams.get("offset") ?? "0")
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

  // GET /products/:identifier/history
  if (slug[0] === "products" && slug.length === 3 && slug[2] === "history") {
    const days = parseInt(url.searchParams.get("days") ?? "30")
    const retailer = url.searchParams.get("retailer") ?? undefined
    const result = await client.getPriceHistory(slug[1], { days, retailer })
    return json(result)
  }

  // GET /deals
  if (slug[0] === "deals") {
    const sort = (url.searchParams.get("sort") ?? "hot") as "hot" | "new" | "top"
    const limit = parseInt(url.searchParams.get("limit") ?? "20")
    const offset = parseInt(url.searchParams.get("offset") ?? "0")
    const category = url.searchParams.get("category") ?? undefined
    const grade = url.searchParams.get("grade") ?? undefined
    const result = await client.getDeals({ sort, limit, offset, category, grade })
    return json(result)
  }

  return jsonError(`Unknown route: /${slug.join("/")}`, 404)
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
