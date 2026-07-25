/**
 * Executive Intelligence Layer — pulse + briefing row, then flash cards.
 * Server component. Uses memoized dashboard loaders only (no new engines/APIs).
 */

import { AiDailyBriefing } from "@/components/dashboard/executive/AiDailyBriefing";
import { AiFlashCards } from "@/components/dashboard/executive/AiFlashCards";
import { MarketPulseRibbon } from "@/components/dashboard/executive/MarketPulseRibbon";
import {
  buildDailyBriefing,
  buildFlashCards,
  buildMarketPulseChips,
} from "@/lib/dashboard/executive-intelligence";
import {
  loadDashboardAboveFold,
  loadDashboardPortfolio,
  loadDashboardRecommendations,
  loadDashboardUpcomingResults,
  loadDashboardWatchlist,
} from "@/lib/market-orchestrator/orchestrator";
import { selectInstitutionalStrategyDashboard } from "@/lib/recommendations";
import {
  peekOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";

export async function ExecutiveIntelligenceLayer() {
  const [aboveFold, portfolio, recommendations, watchlist, results] =
    await Promise.all([
      loadDashboardAboveFold(),
      loadDashboardPortfolio(),
      loadDashboardRecommendations(),
      loadDashboardWatchlist(),
      loadDashboardUpcomingResults(),
    ]);

  const state = peekOpportunityEngineState();
  const marketIntelligence = aboveFold.intelligence;
  const slots = selectInstitutionalStrategyDashboard(
    state,
    toSharedSnapshot(marketIntelligence)
  );

  const chips = buildMarketPulseChips({
    indices: aboveFold.indices,
    pulse: aboveFold.pulse,
    intelligence: marketIntelligence,
    breadth: aboveFold.breadth,
  });

  const briefing = buildDailyBriefing({
    intelligence: marketIntelligence,
    breadth: aboveFold.breadth,
    slots,
    portfolio,
    recommendations,
    results,
  });

  const flashCards = buildFlashCards({
    slots,
    breadth: aboveFold.breadth,
    portfolio,
    recommendations,
    watchlist,
    results,
    intelligence: marketIntelligence,
  });

  return (
    <div className="mb-3 space-y-2 animate-fade-in-up">
      {/* Executive Intelligence Row — 35% Ribbon / 65% Briefing */}
      <div className="grid grid-cols-1 items-stretch gap-2 lg:grid-cols-[minmax(0,35%)_minmax(0,65%)]">
        <MarketPulseRibbon chips={chips} />
        <AiDailyBriefing
          bullets={briefing.bullets}
          updatedAt={briefing.updatedAt}
        />
      </div>
      <AiFlashCards cards={flashCards} />
    </div>
  );
}
