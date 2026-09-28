/**
 * astro-shopsavvy — Astro middleware
 *
 * Injects a configured ShopSavvy API client into Astro's `context.locals`
 * so any page or API endpoint can call `Astro.locals.shopsavvy.*` without
 * re-instantiating the client on every request.
 *
 * Registered automatically by the shopsavvy() integration via
 * integration.ts `addMiddleware()`, which requires this module to export
 * `onRequest`. You do not need to import this directly.
 *
 * Usage in a page or endpoint:
 *
 *   const { shopsavvy } = Astro.locals
 *   const result = await shopsavvy.searchProducts('airpods pro')
 */

import type { MiddlewareHandler } from "astro"
import config from "virtual:astro-shopsavvy/config"
import { createClient, resolveApiKey, type ShopSavvyClient } from "./client.ts"
import type { ShopSavvyIntegrationOptions } from "./types.ts"

export function createShopSavvyMiddleware(options: ShopSavvyIntegrationOptions): MiddlewareHandler {
  // Built on first use and then shared — the client is stateless. Resolving
  // lazily means a missing key does not break pages that never touch
  // ShopSavvy; handleShopSavvyRequest reports it instead.
  let client: ShopSavvyClient | undefined

  return async function shopSavvyMiddleware(context, next) {
    if (!client && resolveApiKey(options)) {
      client = createClient(options)
    }
    if (client) {
      ;(context.locals as { shopsavvy?: ShopSavvyClient }).shopsavvy = client
    }
    return next()
  }
}

export const onRequest: MiddlewareHandler = createShopSavvyMiddleware(config)
