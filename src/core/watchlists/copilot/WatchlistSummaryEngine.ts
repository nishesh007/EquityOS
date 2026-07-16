/**
 * Watchlist Summary Engine — executive copilot summary (Sprint 10B.R6).
 * Composes R3 summary + R5 scorecard; no duplicated AI calculations.
 */

import { getWatchlistHealth, getWatchlistSummary } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getScorecard } from "../analytics";
import type { WatchlistAnalyticsContext } from "../analytics";
import {
  WATCHLIST_COPILOT_EMPTY,
  emptyExecutiveSummary,
  safeCopilotText,
  type ExecutiveSummaryView,
  type WatchlistCopilotContext,
} from "./WatchlistCopilotModels";

export function getExecutiveSummary(
  context?: WatchlistCopilotContext | null
): ExecutiveSummaryView {
  const watchlistId = safeCopilotText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyExecutiveSummary();
  }

  const intelCtx = context as WatchlistIntelligenceContext;
  const summary = getWatchlistSummary(intelCtx);
  const health = getWatchlistHealth(intelCtx);
  const scorecard = getScorecard(context as WatchlistAnalyticsContext);

  const topOpp = summary.biggestWinner
    ? `${summary.biggestWinner.ticker} (${summary.biggestWinner.value})`
    : WATCHLIST_COPILOT_EMPTY.noSuggestions;

  const concern = summary.highestRisk
    ? `${summary.highestRisk.ticker} — ${summary.highestRisk.label}`
    : summary.biggestLoser
      ? `${summary.biggestLoser.ticker} (${summary.biggestLoser.value})`
      : WATCHLIST_COPILOT_EMPTY.noSuggestions;

  const priorityActions: string[] = [];
  if (summary.highestConviction) {
    priorityActions.push(`Monitor ${summary.highestConviction.ticker} for conviction follow-through`);
  }
  if (health.portfolioOverlap < 50) {
    priorityActions.push("Review portfolio overlap before adding new ideas");
  }
  if (scorecard.overallGrade === "D" || scorecard.overallGrade === "F") {
    priorityActions.push("Refresh research on weakest selections");
  }
  if (priorityActions.length === 0) {
    priorityActions.push("Maintain current watchlist discipline");
  }

  return {
    watchlistId,
    paragraph: summary.narrative || WATCHLIST_COPILOT_EMPTY.awaitingAiSummary,
    topOpportunity: topOpp,
    biggestConcern: concern,
    overallHealth: `Grade ${scorecard.overallGrade} · diversification ${health.diversificationScore}`,
    priorityActions: priorityActions.slice(0, 4),
    empty: false,
    emptyMessage: WATCHLIST_COPILOT_EMPTY.awaitingAiSummary,
  };
}

export class WatchlistSummaryEngine {
  getExecutiveSummary = getExecutiveSummary;
}
