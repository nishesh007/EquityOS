import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import { MarketContextCard } from "./MarketContextCard";
import { MarketRegimeCard } from "./MarketRegimeCard";

/**
 * Side-by-side Market Context + Market Regime cards.
 * Shared across Dashboard, Markets, Research, Watchlist, Validation.
 */
export function MarketIntelligenceStrip({
  snapshot,
}: {
  snapshot: MarketIntelligenceSnapshot | null;
}) {
  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      data-testid="market-intelligence-strip"
    >
      <MarketContextCard context={snapshot?.context ?? null} />
      <MarketRegimeCard regime={snapshot?.regime ?? null} />
    </div>
  );
}
