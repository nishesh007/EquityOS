import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import { MarketInternalsCard } from "./MarketInternalsCard";

/**
 * Sprint 10C — single Market Internals card (replaces Context + Regime pair).
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
    <div data-testid="market-intelligence-strip">
      <MarketInternalsCard
        snapshot={snapshot}
        hideTimestamps={hideTimestamps}
      />
    </div>
  );
}
