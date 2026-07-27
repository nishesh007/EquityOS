import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import { MarketContextCard } from "./MarketContextCard";
import { MarketRegimeCard } from "./MarketRegimeCard";

/**
 * Side-by-side Market Context + Market Regime cards.
 * Shared across Dashboard, Markets, Research, Watchlist, Validation.
 */
export function MarketIntelligenceStrip({
  snapshot,
  hideTimestamps = false,
}: {
  snapshot: MarketIntelligenceSnapshot | null;
  hideTimestamps?: boolean;
}) {
  return (
    <div
      className="grid gap-2.5 lg:grid-cols-2"
      data-testid="market-intelligence-strip"
    >
      <MarketContextCard
        context={snapshot?.context ?? null}
        hideTimestamps={hideTimestamps}
      />
      <MarketRegimeCard
        regime={snapshot?.regime ?? null}
        hideTimestamps={hideTimestamps}
      />
    </div>
  );
}
