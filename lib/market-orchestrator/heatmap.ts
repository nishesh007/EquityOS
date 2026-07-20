/**
 * Request-scoped shared market heatmap for the dashboard orchestrator.
 * Single fetchMarketHeatmap("nse") ownership per dashboard load — no engine changes.
 */

import { fetchMarketHeatmap } from "@/services/researchDashboardData";
import type { MarketHeatmapData } from "./types";
import { dedupeInFlight } from "./cache";

const SHARED_HEATMAP_KEY = "dashboard-shared-heatmap";

/**
 * Shared NSE heatmap snapshot for one dashboard request.
 * Concurrent orchestrator callers coalesce on the same Promise.
 */
export function getSharedDashboardHeatmap(): Promise<MarketHeatmapData> {
  return dedupeInFlight(SHARED_HEATMAP_KEY, () => fetchMarketHeatmap("nse"));
}
