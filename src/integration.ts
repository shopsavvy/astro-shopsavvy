/**
 * astro-shopsavvy — Astro integration object
 *
 * Registers the ShopSavvy middleware (which injects a client into
 * `Astro.locals.shopsavvy`) and exposes the integration options to that
 * middleware through the `virtual:astro-shopsavvy/config` module.
 *
 * Consumed by the main shopsavvy() export in src/index.ts.
 */

import type { AstroIntegration } from "astro"
import type { ShopSavvyIntegrationOptions } from "./types.ts"

export const VIRTUAL_CONFIG_ID = "virtual:astro-shopsavvy/config"
const RESOLVED_VIRTUAL_CONFIG_ID = "\0" + VIRTUAL_CONFIG_ID

export function createShopSavvyIntegration(options: ShopSavvyIntegrationOptions = {}): AstroIntegration {
  return {
    name: "astro-shopsavvy",

    hooks: {
      "astro:config:setup"({ addMiddleware, updateConfig, logger }) {
        logger.info("astro-shopsavvy: registering middleware")

        // Middleware modules are loaded by Vite, not called by us, so the options
        // passed to shopsavvy() reach the middleware through a virtual module.
        // apiKey is only serialized when it was passed explicitly; otherwise the
        // middleware reads SHOPSAVVY_API_KEY from the environment at request time
        // so the key is never written into the server bundle.
        const serialized = JSON.stringify({
          ...(options.apiKey ? { apiKey: options.apiKey } : {}),
          ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
          ...(options.timeout ? { timeout: options.timeout } : {}),
        })

        updateConfig({
          vite: {
            plugins: [
              {
                name: "astro-shopsavvy:config",
                resolveId(id: string) {
                  return id === VIRTUAL_CONFIG_ID ? RESOLVED_VIRTUAL_CONFIG_ID : undefined
                },
                load(id: string) {
                  return id === RESOLVED_VIRTUAL_CONFIG_ID ? `export default ${serialized}` : undefined
                },
              },
            ],
          },
        })

        addMiddleware({
          entrypoint: new URL("./middleware.ts", import.meta.url),
          order: "pre",
        })
      },
    },
  }
}
