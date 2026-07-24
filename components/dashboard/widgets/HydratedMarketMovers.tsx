"use client";

/**
 * Hydrates Market Movers from /api/market/breadth when SSR cached breadth is empty.
 * Shares the client breadth coalescer with Market Internals.
 */

import { MarketMoversWidget } from "@/components/dashboard/widgets/DeferredDashboardWidgets";
import { WidgetSkeleton } from "@/components/dashboard/widgets/WidgetSkeleton";
import {
  fetchClientMarketBreadth,
  isUsableMarketBreadth,
} from "@/lib/market-orchestrator/client-breadth";
import type { MarketBreadth } from "@/types";
import { useEffect, useState } from "react";

export function HydratedMarketMovers({
  initial,
}: {
  initial: MarketBreadth;
}) {
  const [breadth, setBreadth] = useState(initial);
  const [loading, setLoading] = useState(!isUsableMarketBreadth(initial));

  useEffect(() => {
    setBreadth(initial);
    if (isUsableMarketBreadth(initial)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchClientMarketBreadth(initial.universe ?? "nse").then((next) => {
      if (cancelled || !next) {
        if (!cancelled) setLoading(false);
        return;
      }
      setBreadth(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  if (loading && !isUsableMarketBreadth(breadth)) {
    return <WidgetSkeleton label="Market Movers" className="h-48" />;
  }

  return <MarketMoversWidget breadth={breadth} />;
}
