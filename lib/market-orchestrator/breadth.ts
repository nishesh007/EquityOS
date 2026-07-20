/**
 * Request-scoped shared market breadth for the dashboard orchestrator.
 * Single fetchMarketBreadth("nse") ownership per dashboard load — no engine changes.
 */

import { fetchMarketBreadth } from "@/services/researchDashboardData";
import type { MarketBreadth } from "@/types";
import { dedupeInFlight } from "./cache";

const SHARED_BREADTH_KEY = "dashboard-shared-breadth";

/**
 * Shared NSE breadth snapshot for one dashboard request.
 * Concurrent orchestrator callers coalesce on the same Promise.
 */
export function getSharedDashboardBreadth(): Promise<MarketBreadth> {
  return dedupeInFlight(SHARED_BREADTH_KEY, () => fetchMarketBreadth("nse"));
}
