"use client";

import { WatchlistEarningsPanel } from "@/components/dashboard/earnings";
import type { WatchlistEarningsSurface } from "@/src/core/earnings/calendar";
import { EXECUTIVE_EARNINGS_EMPTY } from "@/lib/dashboard/executive-earnings-presentation";
import { ExecutiveEmptyState } from "@/src/presentation/dashboard/earnings/ExecutiveEmptyState";

/** Composes R1 watchlist earnings surface. */
export function ExecutiveWatchlistPanel({
  surface,
}: {
  surface: WatchlistEarningsSurface;
}) {
  return (
    <div id="executive-watchlist" data-testid="executive-watchlist-panel">
      {surface.empty ? (
        <ExecutiveEmptyState message={EXECUTIVE_EARNINGS_EMPTY.noWatchlist} />
      ) : (
        <WatchlistEarningsPanel surface={surface} />
      )}
    </div>
  );
}
