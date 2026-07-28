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
import { selectVerifiedConsensusStrategyDashboard } from "@/lib/recommendations/verification";
import { readPublishedFromState } from "@/lib/recommendations/published/client";
import {
  loadOpportunityEngineState,
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
  const published = readPublishedFromState(state);
  const slots = selectVerifiedConsensusStrategyDashboard(
    published?.recommendations ?? [],
    published?.generatedAt ?? state.lastScannedAt ?? new Date(0).toISOString(),
    {
      breadthScore: marketIntelligence?.context?.breadthScore ?? null,
      asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
      regime: marketIntelligence?.regime?.regime ?? null,
      marketTrend:
        marketIntelligence?.context?.marketTrend ??
        marketIntelligence?.regime?.regime ??
        null,
    }
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
