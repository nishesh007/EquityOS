/**
 * Server-only market heatmap fetch — disk last-snapshot + SWR memory cache.
 * Keep this module out of Client Component import graphs (uses node:fs).
 */

import {
  runMarketHeatmapEngine,
  type HeatmapUniverseId,
  type MarketHeatmapSnapshot,
} from "@/lib/market-heatmap";
import {
  isUsableHeatmapSnapshot,
  readLastHeatmapSnapshot,
  writeLastHeatmapSnapshot,
} from "@/lib/market-heatmap/last-snapshot";
import { isTimestampInCurrentSession } from "@/lib/market/market-state-manager";
import {
  getCachedStaleWhileRevalidate,
  getStaleCachedSync,
  seedCache,
  cacheKey,
  CACHE_TTL,
} from "@/lib/cache";

export async function fetchMarketHeatmap(
  universe: HeatmapUniverseId = "nse"
): Promise<MarketHeatmapSnapshot> {
  const ttl =
    universe === "nse" || universe === "nifty500"
      ? CACHE_TTL.FIFTEEN_MINUTES
      : CACHE_TTL.DASHBOARD;
  const key = cacheKey("market-heatmap", universe);

  // Cold process: seed memory from previous-session disk snapshot so
  // dashboard hydrate never waits on a full universe heatmap scan.
  if (!getStaleCachedSync<MarketHeatmapSnapshot>(key)) {
    const disk = readLastHeatmapSnapshot(universe);
    if (
      disk &&
      isUsableHeatmapSnapshot(disk) &&
      isTimestampInCurrentSession(disk.lastUpdated)
    ) {
      seedCache(key, disk, ttl);
    }
  }

  return getCachedStaleWhileRevalidate(
    { key, ttlMs: ttl },
    async () => {
      const live = await runMarketHeatmapEngine({ universe });
      if (isUsableHeatmapSnapshot(live)) {
        writeLastHeatmapSnapshot(universe, live);
      }
      return live;
    },
    isUsableHeatmapSnapshot
  );
}
