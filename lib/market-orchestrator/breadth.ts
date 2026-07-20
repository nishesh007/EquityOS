/**
 * Request-scoped shared market breadth for the dashboard orchestrator.
 * Single fetchMarketBreadth("nse") ownership per dashboard load — no engine changes.
 */

import { cache } from "react";
import type { MarketBreadth } from "@/types";
import { dedupeInFlight } from "./cache";
import { memoizedFetchMarketBreadth } from "./memoizedReads";

const SHARED_BREADTH_KEY = "dashboard-shared-breadth";

/**
 * Shared NSE breadth snapshot for one dashboard request.
 * React cache() memoizes per RSC request; dedupeInFlight coalesces concurrent callers.
 */
export const getSharedDashboardBreadth = cache(
  function getSharedDashboardBreadth(): Promise<MarketBreadth> {
    return dedupeInFlight(SHARED_BREADTH_KEY, () =>
      memoizedFetchMarketBreadth("nse")
    );
  }
);
