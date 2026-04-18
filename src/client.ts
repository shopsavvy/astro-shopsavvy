/**
 * astro-shopsavvy — thin wrapper around @shopsavvy/sdk
 *
 * Resolves the API key from options or environment variables, then exposes
 * the same ShopSavvyDataAPI methods under a consistent interface used by
 * the middleware, loaders, and endpoint helpers.
 */

import { ShopSavvyDataAPI } from "@shopsavvy/sdk"
import type { ShopSavvyIntegrationOptions } from "./types.ts"

export type ShopSavvyClient = ShopSavvyDataAPI

/**
 * Create a configured ShopSavvy API client.
 *
 * @throws if no API key is found in options or environment variables.
 */
export function createClient(options: ShopSavvyIntegrationOptions = {}): ShopSavvyClient {
  const apiKey = options.apiKey ?? process.env.SHOPSAVVY_API_KEY
  if (!apiKey) {
    throw new Error(
      "astro-shopsavvy: No API key found. " +
        "Pass { apiKey } to the shopsavvy() integration or set the SHOPSAVVY_API_KEY environment variable. " +
        "Get your key at https://shopsavvy.com/data"
    )
  }

  return new ShopSavvyDataAPI({
    apiKey,
    baseUrl: options.baseUrl,
    timeout: options.timeout ?? 10_000,
  })
}
