/**
 * Client-safe Markets refresh policy (no server-only imports).
 */

import {
  getMarketStatus,
  isTradingDay,
  type MarketStatus,
} from "@/lib/market/session";

/** Markets page refresh cadence during cash-market hours. */
export const MARKETS_REFRESH_MS_OPEN = 2 * 60 * 1000;

export type MarketsRefreshMode = "poll" | "final" | "static";

/**
 * Refresh policy for the institutional Markets page:
 * - open: poll every 2 minutes
 * - post_close (trading day): one final refresh then static
 * - weekend / holiday / pre_open closed: static (latest completed session)
 */
export function resolveMarketsRefreshMode(
  now = new Date()
): MarketsRefreshMode {
  const status = getMarketStatus(now);
  if (status === "open") return "poll";
  if (status === "post_close" && isTradingDay(now)) return "final";
  return "static";
}

export function getMarketsRefreshIntervalMs(now = new Date()): number {
  return resolveMarketsRefreshMode(now) === "poll"
    ? MARKETS_REFRESH_MS_OPEN
    : 0;
}

export function isMarketsPollingStatus(status: MarketStatus): boolean {
  return status === "open";
}
