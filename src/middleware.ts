/**
 * astro-shopsavvy — Astro middleware
 *
 * Injects a configured ShopSavvy API client into Astro's `context.locals`
 * so any page or API endpoint can call `Astro.locals.shopsavvy.*` without
 * re-instantiating the client on every request.
 *
 * Registered automatically by the shopsavvy() integration via
 * integration.ts `addMiddleware()`. You do not need to import this directly.
 *
 * Usage in a page or endpoint:
 *
 *   const { shopsavvy } = Astro.locals
 *   const result = await shopsavvy.searchProducts('airpods pro')
 */

import type { MiddlewareHandler } from "astro"
import { createClient } from "./client.ts"
import type { ShopSavvyIntegrationOptions } from "./types.ts"

export function createShopSavvyMiddleware(options: ShopSavvyIntegrationOptions): MiddlewareHandler {
  // Build client once — it is stateless and safe to share across requests.
  const client = createClient(options)

  return async function shopSavvyMiddleware(_context, next) {
    // @ts-expect-error: locals augmented at runtime via integration
    _context.locals.shopsavvy = client
    return next()
  }
}
