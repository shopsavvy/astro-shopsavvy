import type { ProductWithOfferHistory } from "@shopsavvy/sdk"

/** One line on the <PriceHistory /> chart: a single offer's prices, one per calendar day. */
export interface PriceHistoryChartSeries {
  label: string
  /** The offer's ISO 4217 currency, or null when the API recorded none. */
  currency: string | null
  /** Aligned with `PriceHistoryChartData.dates`; null where the offer has no point that day. */
  prices: (number | null)[]
}

export interface PriceHistoryChartData {
  /** Every calendar day (YYYY-MM-DD) that has at least one point, ascending. */
  dates: string[]
  series: PriceHistoryChartSeries[]
  /** The currency shared by every series, or null when they differ or any is unknown. */
  currency: string | null
}

/**
 * Turns a price-history response's `data` into chart series.
 *
 * `GET /products/offers/history` returns one entry per PRODUCT, each with its `offers`,
 * each offer carrying its own `history` (newest first). Every offer with at least one
 * point becomes a series; offers with an empty history (e.g. eBay listings) are left
 * off rather than drawn as an empty line. Points are bucketed by calendar day (the
 * timestamp's YYYY-MM-DD prefix), keeping the newest observation for a day.
 */
export function priceHistoryChartData(products: ProductWithOfferHistory[]): PriceHistoryChartData {
  const offers = products.flatMap((product) => product.offers ?? []).filter((offer) => (offer.history ?? []).length > 0)

  const byDay = offers.map((offer) => {
    const prices = new Map<string, number>()
    for (const point of offer.history) {
      const day = point.timestamp.slice(0, 10)
      if (!prices.has(day)) prices.set(day, point.price)
    }
    return prices
  })

  const dates = Array.from(new Set(byDay.flatMap((prices) => Array.from(prices.keys())))).sort()

  const series = offers.map((offer, i) => ({
    label: offer.seller ? `${offer.retailer ?? "Unknown retailer"} (${offer.seller})` : (offer.retailer ?? "Unknown retailer"),
    currency: offer.currency ?? null,
    prices: dates.map((day) => byDay[i].get(day) ?? null),
  }))

  const currencies = new Set(series.map((s) => s.currency))
  const [only] = currencies
  const currency = currencies.size === 1 && only !== null && only !== undefined ? only : null

  return { dates, series, currency }
}
