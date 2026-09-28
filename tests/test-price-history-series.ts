/**
 * priceHistoryChartData() — the <PriceHistory /> chart's parsing of a price-history
 * response — driven by the real /products/offers/history shape (one entry per product,
 * each offer carrying `history`, newest first), fetched through the REAL SDK client.
 * Run with: bun run tests/test-price-history-series.ts
 */

import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { readFileSync } from "node:fs"
import { createClient } from "../src/client.ts"
import { priceHistoryChartData } from "../src/price-history-series.ts"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    process.exit(1)
  }
  console.log(`PASS: ${message}`)
}

const fixture = readFileSync(new URL("./test-fixture-price-history-response.json", import.meta.url), "utf8")
const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" })
  res.end(fixture)
})
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const client = createClient({ apiKey: "ss_test_series123", baseUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1` })

try {
  const response = await client.getPriceHistory("611247373064", "2022-11-01", "2022-11-30")
  const chart = priceHistoryChartData(response.data)

  assert(chart.series.length === 2, "one series per offer with history, across every product (the eBay offer with no points is left off)")
  assert(
    JSON.stringify(chart.series.map((s) => s.label)) === JSON.stringify(["Amazon (ACME Deals)", "Best Buy"]),
    "series are labelled by retailer, with the marketplace seller when there is one"
  )
  assert(
    JSON.stringify(chart.dates) === JSON.stringify(["2022-11-21", "2022-11-22", "2022-11-24", "2022-11-26", "2022-11-27"]),
    "dates are every day with a point, ascending (history arrives newest first)"
  )
  assert(
    JSON.stringify(chart.series[0].prices) === JSON.stringify([79.99, null, 70.99, null, 74.96]),
    "Amazon prices line up with the dates, null where it has no point"
  )
  assert(
    JSON.stringify(chart.series[1].prices) === JSON.stringify([null, 64.99, null, 59.99, null]),
    "Best Buy prices line up with the dates"
  )
  assert(chart.series.every((s) => s.currency === "USD") && chart.currency === "USD", "the offers' shared currency is the chart currency")

  const sameDay = priceHistoryChartData([
    {
      title: "x",
      shopsavvy: "p1",
      offers: [
        {
          id: "o1",
          retailer: "Walmart",
          currency: "CAD",
          history: [
            { timestamp: "2026-01-02T18:00:00Z", price: 12, currency: "CAD" },
            { timestamp: "2026-01-02T06:00:00Z", price: 15, currency: "CAD" },
          ],
        },
        { id: "o2", retailer: "Amazon", currency: null, history: [{ timestamp: "2026-01-02T00:00:00Z", price: 11, currency: null }] },
      ],
    } as any,
  ])
  assert(sameDay.series[0].prices[0] === 12, "two points on one day keep the newest")
  assert(sameDay.series[1].currency === null, "an offer with no recorded currency stays null (never assumed USD)")
  assert(sameDay.currency === null, "mixed or unknown currencies leave the chart currency null")

  const empty = priceHistoryChartData([])
  assert(empty.series.length === 0 && empty.dates.length === 0, "an empty response has no series")
} finally {
  server.close()
}
