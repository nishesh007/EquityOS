/**
 * Executive Intelligence Layer — AI Daily Briefing only.
 * Market Event Alert sits above this in the dashboard executive slot.
 * Pulse ribbon + flash cards removed to eliminate duplicate market chrome.
 */

import { AiDailyBriefing } from "@/components/dashboard/executive/AiDailyBriefing";
import { buildDailyBriefing } from "@/lib/dashboard/executive-intelligence";
import {
  loadDashboardAboveFold,
  loadDashboardPortfolio,
  loadDashboardRecommendations,
  loadDashboardUpcomingResults,
} from "@/lib/market-orchestrator/orchestrator";
import { selectInstitutionalStrategyDashboard } from "@/lib/recommendations";
import {
  loadOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";

export async function ExecutiveIntelligenceLayer() {
  const [aboveFold, portfolio, recommendations, results, state] = await Promise.all([
    loadDashboardAboveFold(),
    loadDashboardPortfolio(),
    loadDashboardRecommendations(),
    loadDashboardUpcomingResults(),
    loadOpportunityEngineState(),
  ]);

  const marketIntelligence = aboveFold.intelligence;
  const slots = selectInstitutionalStrategyDashboard(
    state,
    toSharedSnapshot(marketIntelligence)
  );

  const briefing = buildDailyBriefing({
    intelligence: marketIntelligence,
    breadth: aboveFold.breadth,
    slots,
    portfolio,
    recommendations,
    results,
  });

  return (
    <div className="mb-3 animate-fade-in-up">
      <AiDailyBriefing
        bullets={briefing.bullets}
        updatedAt={briefing.updatedAt}
      />
    </div>
  );
}
