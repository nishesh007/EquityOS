/**
 * NSE trade_info delivery % enrichment for mover cards.
 * Does not alter breadth scoring — only attaches deliveryPercent when available.
 */

import { adapterFetch } from "@/lib/adapters/http";
import { resolveMarketDataSymbol } from "@/lib/fundamentals/symbols";
import { loadProviderConfig } from "@/lib/providers/config";
import type { EnrichedQuote } from "@/lib/market-data/enriched-quote";
import type { MarketMover } from "@/types";

interface NseTradeInfoResponse {
  securityWiseDP?: {
    deliveryToTradedQuantity?: number | string;
    deliveryQuantity?: number;
    quantityTraded?: number;
  };
}

const DELIVERY_TIMEOUT_MS = 6_000;
const DELIVERY_CONCURRENCY = 5;
const MAX_DELIVERY_SYMBOLS = 25;

let deliveryUnavailableLogged = false;

function parseDeliveryPercent(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw >= 0 && raw <= 100 ? raw : null;
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseFloat(raw.replace(/%/g, "").trim());
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return parsed;
  }
  return null;
}

async function fetchNseDeliveryPercent(symbol: string): Promise<number | null> {
  const config = loadProviderConfig();
  if (!config.nse.enabled) {
    if (!deliveryUnavailableLogged) {
      deliveryUnavailableLogged = true;
      console.warn(
        "[DeliveryLeaders] NSE adapter disabled — delivery % Unavailable (set NSE_ENABLED=true)"
      );
    }
    return null;
  }

  const baseUrl = config.nse.baseUrl ?? "https://www.nseindia.com/api";
  const quoteSymbol = resolveMarketDataSymbol(symbol.toUpperCase());
  const url = `${baseUrl}/quote-equity?symbol=${encodeURIComponent(quoteSymbol)}&section=trade_info`;

  try {
    const data = await adapterFetch<NseTradeInfoResponse>(url, {
      timeout: DELIVERY_TIMEOUT_MS,
      headers: {
        Referer: "https://www.nseindia.com/",
        Origin: "https://www.nseindia.com",
      },
    });
    return parseDeliveryPercent(
      data.securityWiseDP?.deliveryToTradedQuantity
    );
  } catch (error) {
    console.warn(
      `[DeliveryLeaders] trade_info failed for ${symbol}:`,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, Math.max(1, items.length)) },
      () => run()
    )
  );
  return results;
}

function withDelivery(
  mover: MarketMover,
  deliveryPercent: number | null
): MarketMover {
  if (deliveryPercent == null || !mover.quote) return mover;
  const quote: EnrichedQuote = {
    ...mover.quote,
    deliveryPercent,
  };
  return { ...mover, quote };
}

/**
 * Attach NSE delivery % onto mover quotes for Delivery Leaders ranking.
 * Caps symbols and concurrency so breadth latency stays bounded.
 */
export async function enrichMoversWithDelivery(
  movers: readonly MarketMover[]
): Promise<{ movers: MarketMover[]; fetched: number; resolved: number }> {
  const unique: MarketMover[] = [];
  const seen = new Set<string>();
  for (const mover of movers) {
    const key = mover.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(mover);
    if (unique.length >= MAX_DELIVERY_SYMBOLS) break;
  }

  if (unique.length === 0) {
    return { movers: [], fetched: 0, resolved: 0 };
  }

  const deliveries = await mapPool(
    unique,
    DELIVERY_CONCURRENCY,
    async (mover) => {
      if (
        mover.quote?.deliveryPercent != null &&
        Number.isFinite(mover.quote.deliveryPercent)
      ) {
        return mover.quote.deliveryPercent;
      }
      return fetchNseDeliveryPercent(mover.symbol);
    }
  );

  let resolved = 0;
  const enriched = unique.map((mover, index) => {
    const pct = deliveries[index];
    if (pct != null) {
      resolved += 1;
      return withDelivery(mover, pct);
    }
    return mover;
  });

  if (resolved === 0) {
    console.warn(
      `[DeliveryLeaders] No delivery % resolved for ${unique.length} candidates — UI will show Unavailable`
    );
  }

  return { movers: enriched, fetched: unique.length, resolved };
}

export { parseDeliveryPercent, fetchNseDeliveryPercent };
