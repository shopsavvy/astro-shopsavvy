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
 * The API key from options, else SHOPSAVVY_API_KEY. Astro loads `.env` into
 * `import.meta.env` (not `process.env`) for server code, so both are checked.
 *
 * Keep the literal `import.meta.env.SHOPSAVVY_API_KEY` spelling: Astro/Vite
 * statically replace exactly that expression with the private env value. The
 * runtime `import.meta.env` object only carries PUBLIC_ vars, so optional
 * chaining or reading it through a variable silently yields undefined.
 */
export function resolveApiKey(options: ShopSavvyIntegrationOptions = {}): string | undefined {
  const fromImportMeta =
    typeof (import.meta as any).env !== "undefined" ? (import.meta as any).env.SHOPSAVVY_API_KEY : undefined
  // Runtime process.env wins over import.meta.env, which Astro inlines at build
  // time — so a deployed server picks up a rotated key without a rebuild.
  return (
    options.apiKey ||
    (typeof process !== "undefined" ? process.env?.SHOPSAVVY_API_KEY : undefined) ||
    fromImportMeta ||
    undefined
  )
}

/**
 * Create a configured ShopSavvy API client.
 *
 * @throws if no API key is found in options or environment variables.
 */
export function createClient(options: ShopSavvyIntegrationOptions = {}): ShopSavvyClient {
  const apiKey = resolveApiKey(options)
  if (!apiKey) {
    throw new Error(
      "astro-shopsavvy: No API key found. " +
        "Pass { apiKey } to the shopsavvy() integration or set the SHOPSAVVY_API_KEY environment variable. " +
        "Get your key at https://shopsavvy.com/data"
    )
  }

  return new ShopSavvyDataAPI({
    apiKey,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    timeout: options.timeout ?? 10_000,
  })
}
