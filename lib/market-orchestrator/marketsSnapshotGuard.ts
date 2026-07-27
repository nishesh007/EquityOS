/**
 * Pure MarketSnapshot guards (client + test safe).
 */

import type { MarketSnapshot } from "@/lib/market-orchestrator/types";

export function assertUniformMarketSnapshotTimestamp(
  snapshot: MarketSnapshot
): boolean {
  const t = snapshot.timestamp;
  if (!t) return false;
  if (snapshot.breadth.lastUpdated && snapshot.breadth.lastUpdated !== t) {
    return false;
  }
  if (snapshot.heatmap?.lastUpdated && snapshot.heatmap.lastUpdated !== t) {
    return false;
  }
  if (
    snapshot.intelligence?.timestamp &&
    snapshot.intelligence.timestamp !== t
  ) {
    return false;
  }
  if (
    snapshot.intelligence?.context?.timestamp &&
    snapshot.intelligence.context.timestamp !== t
  ) {
    return false;
  }
  if (
    snapshot.intelligence?.regime?.timestamp &&
    snapshot.intelligence.regime.timestamp !== t
  ) {
    return false;
  }
  return true;
}
