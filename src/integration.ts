/**
 * astro-shopsavvy — Astro integration object
 *
 * Registers the ShopSavvy middleware and adds the virtual `astro-shopsavvy`
 * module so Astro can resolve components and helpers without explicit paths.
 *
 * Consumed by the main shopsavvy() export in src/index.ts.
 */

import type { AstroIntegration } from "astro"
import type { ShopSavvyIntegrationOptions } from "./types.ts"

export function createShopSavvyIntegration(options: ShopSavvyIntegrationOptions = {}): AstroIntegration {
  return {
    name: "astro-shopsavvy",

    hooks: {
      "astro:config:setup"({ addMiddleware, logger }) {
        logger.info("astro-shopsavvy: registering middleware")

        addMiddleware({
          entrypoint: new URL("./middleware.ts", import.meta.url).pathname,
          order: "pre",
        })
      },

      "astro:config:done"({ logger }) {
        const apiKey = options.apiKey ?? process.env.SHOPSAVVY_API_KEY
        if (!apiKey) {
          logger.warn(
            "astro-shopsavvy: No API key found. " +
              "Set SHOPSAVVY_API_KEY in your environment or pass { apiKey } to shopsavvy(). " +
              "Get your key at https://shopsavvy.com/data"
          )
        }
      },

      "astro:build:done"({ logger }) {
        logger.info("astro-shopsavvy: build complete")
      },
    },
  }
}
