/**
 * Client-side shared breadth fetch — coalesces Internals + Movers hydrate
 * so both panels share one /api/market/breadth round-trip.
 */

import type { MarketBreadth } from "@/types";
import type { BreadthUniverseId } from "@/lib/market-breadth/types";

export function isUsableMarketBreadth(breadth: MarketBreadth | null | undefined): boolean {
  if (!breadth) return false;
  const movers =
    (breadth.gainers?.length ?? 0) +
    (breadth.losers?.length ?? 0) +
    (breadth.mostActive?.length ?? 0);
  const participation = breadth.advances + breadth.declines + breadth.unchanged;
  const sectors = breadth.sectors?.length ?? 0;
  // Usable when any real participation / movers exist — even if mood
  // classifier still reports "Insufficient Data" due to coverage thresholds.
  return (
    movers > 0 ||
    participation > 0 ||
    sectors > 0 ||
    (breadth.totalStocks > 0 && (breadth.quotedStocks ?? 0) > 0)
  );
}

const cache = new Map<string, MarketBreadth>();
const inflight = new Map<string, Promise<MarketBreadth | null>>();

export async function fetchClientMarketBreadth(
  universe: BreadthUniverseId | string = "nse",
  options: { force?: boolean } = {}
): Promise<MarketBreadth | null> {
  const key = String(universe);
  if (!options.force) {
    const hit = cache.get(key);
    if (hit && isUsableMarketBreadth(hit)) return hit;
    const pending = inflight.get(key);
    if (pending) return pending;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/market/breadth?universe=${encodeURIComponent(key)}`, {
        cache: "no-store",
      });
      if (!res.ok) return cache.get(key) ?? null;
      const json = (await res.json()) as { breadth?: MarketBreadth };
      if (json.breadth && isUsableMarketBreadth(json.breadth)) {
        cache.set(key, json.breadth);
        return json.breadth;
      }
      if (json.breadth) {
        cache.set(key, json.breadth);
        return json.breadth;
      }
      return cache.get(key) ?? null;
    } catch {
      return cache.get(key) ?? null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
