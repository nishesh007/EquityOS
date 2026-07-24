"use client";

/**
 * Hydrates Market Snapshot intelligence strip from client breadth when
 * SSR only had neutral MI fallback (A/D 0/0, momentum 0, etc.).
 */

import { MarketSnapshotWidget } from "@/components/dashboard/widgets/DashboardWidgets";
import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import {
  fetchClientMarketBreadth,
  isUsableMarketBreadth,
} from "@/lib/market-orchestrator/client-breadth";
import { enrichSnapshotFromBreadth } from "@/lib/market-orchestrator/enrich-context-from-breadth";
import type { MarketBreadth, MarketIndex } from "@/types";
import { useEffect, useMemo, useState } from "react";

export function HydratedMarketSnapshot({
  indices,
  marketIntelligence,
  breadth: initialBreadth,
}: {
  indices: MarketIndex[];
  marketIntelligence: MarketIntelligenceSnapshot;
  breadth: MarketBreadth;
}) {
  const [breadth, setBreadth] = useState(initialBreadth);

  useEffect(() => {
    setBreadth(initialBreadth);
    if (isUsableMarketBreadth(initialBreadth)) return;

    let cancelled = false;
    void fetchClientMarketBreadth(initialBreadth.universe ?? "nse").then(
      (next) => {
        if (cancelled || !next) return;
        setBreadth(next);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [initialBreadth]);

  const snapshot = useMemo((): MarketIntelligenceSnapshot => {
    return enrichSnapshotFromBreadth(marketIntelligence, breadth);
  }, [marketIntelligence, breadth]);

  return (
    <MarketSnapshotWidget
      indices={indices}
      marketIntelligence={snapshot}
      breadth={breadth}
    />
  );
}
