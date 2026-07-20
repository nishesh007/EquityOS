/**
 * Request-scoped shared market heatmap for the dashboard orchestrator.
 * Single fetchMarketHeatmap("nse") ownership per dashboard load — no engine changes.
 */

import { cache } from "react";
import type { MarketHeatmapData } from "./types";
import { dedupeInFlight } from "./cache";
import { memoizedFetchMarketHeatmap } from "./memoizedReads";

const SHARED_HEATMAP_KEY = "dashboard-shared-heatmap";

/**
 * Shared NSE heatmap snapshot for one dashboard request.
 * React cache() memoizes per RSC request; dedupeInFlight coalesces concurrent callers.
 */
export const getSharedDashboardHeatmap = cache(
  function getSharedDashboardHeatmap(): Promise<MarketHeatmapData> {
    return dedupeInFlight(SHARED_HEATMAP_KEY, () =>
      memoizedFetchMarketHeatmap("nse")
    );
  }
);
