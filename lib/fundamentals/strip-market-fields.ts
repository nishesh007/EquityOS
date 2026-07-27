/**
 * Fundamentals ↔ Market Data boundary.
 *
 * Fundamentals MUST NEVER supply live market prices.
 * LTP / OHLC / volume / change% come only from `@/lib/market-data`.
 */

import type { FundamentalsPeerSeed } from "@/lib/fundamentals/seed-types";
import type { PeerCompany } from "@/types";

/** Market-price keys forbidden on fundamentals payloads. */
export const FUNDAMENTALS_FORBIDDEN_MARKET_KEYS = [
  "price",
  "change",
  "changePercent",
  "ltp",
  "open",
  "high",
  "low",
  "close",
  "previousClose",
  "volume",
  "vwap",
  "ohlc",
  "priceHistory",
] as const;

export type FundamentalsForbiddenMarketKey =
  (typeof FUNDAMENTALS_FORBIDDEN_MARKET_KEYS)[number];

/** Peers from fundamentals — identity + ratios only (no LTP fields). */
export function stripPeerMarketPrices(
  peers: readonly (FundamentalsPeerSeed | PeerCompany | Record<string, unknown>)[]
): FundamentalsPeerSeed[] {
  return peers.map((peer) => {
    const row = peer as FundamentalsPeerSeed & Partial<PeerCompany>;
    return {
      symbol: String(row.symbol ?? "").toUpperCase(),
      name: String(row.name ?? row.symbol ?? ""),
      pe: typeof row.pe === "number" && Number.isFinite(row.pe) ? row.pe : 0,
      marketCap: String(row.marketCap || "—"),
    };
  });
}

/** Map fundamentals peers onto display PeerCompany slots (prices zero until quote attach). */
export function fundamentalsPeersToDisplay(
  peers: readonly FundamentalsPeerSeed[]
): PeerCompany[] {
  return peers.map((peer) => ({
    symbol: peer.symbol,
    name: peer.name,
    pe: peer.pe,
    marketCap: peer.marketCap || "—",
    price: 0,
    changePercent: 0,
    quote: undefined,
  }));
}

/**
 * Canonical live price resolver.
 * NEVER trusts bare profile.price as a market quote — only EnrichedQuote.price.
 */
export function resolveLiveMarketPrice(input: {
  quotePrice?: number | null;
  /** @deprecated Ignored — fundamentals/profile stub prices are never authoritative. */
  profilePrice?: number | null;
  hasLiveQuote?: boolean;
}): number | null {
  if (
    typeof input.quotePrice === "number" &&
    Number.isFinite(input.quotePrice) &&
    input.quotePrice > 0
  ) {
    return input.quotePrice;
  }
  return null;
}

/** Deep-scan an object for forbidden market-price keys (fundamentals payloads). */
export function findForbiddenMarketKeys(
  value: unknown,
  path = ""
): string[] {
  if (value == null || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenMarketKeys(item, `${path}[${index}]`)
    );
  }
  const hits: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = path ? `${path}.${key}` : key;
    if (
      (FUNDAMENTALS_FORBIDDEN_MARKET_KEYS as readonly string[]).includes(key)
    ) {
      hits.push(next);
    }
    // Don't descend into nested quote objects that shouldn't exist on fundamentals.
    hits.push(...findForbiddenMarketKeys(child, next));
  }
  return hits;
}

export function assertNoMarketPricesOnFundamentals(
  payload: unknown,
  label = "fundamentals"
): void {
  const hits = findForbiddenMarketKeys(payload);
  if (hits.length > 0) {
    throw new Error(
      `${label} contains forbidden market-price fields: ${hits.slice(0, 12).join(", ")}`
    );
  }
}
