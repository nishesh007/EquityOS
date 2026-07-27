/**
 * HydratedMarketSnapshot — deprecated.
 * Dashboard now renders MarketSnapshotWidget directly from the canonical
 * Market Snapshot (same Context/Regime as Markets). Kept as a thin passthrough
 * for any residual imports.
 */

import { MarketSnapshotWidget } from "@/components/dashboard/widgets/DashboardWidgets";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { MarketBreadth, MarketIndex } from "@/types";

/** @deprecated Prefer MarketSnapshotWidget with canonical snapshot props. */
export function HydratedMarketSnapshot({
  indices,
  marketIntelligence,
  breadth,
}: {
  indices: MarketIndex[];
  marketIntelligence: MarketIntelligenceSnapshot;
  breadth: MarketBreadth;
}) {
  return (
    <MarketSnapshotWidget
      indices={indices}
      marketIntelligence={marketIntelligence}
      breadth={breadth}
    />
  );
}
