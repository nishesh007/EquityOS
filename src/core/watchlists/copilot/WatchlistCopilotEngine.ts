/**
 * Watchlist Copilot Engine — research companion & orchestrator (Sprint 10B.R6).
 */

import { getWatchlistRecommendations, getWatchlistOpportunities } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getWatchlistResearch } from "../workspace";
import { WATCHLIST_SURFACE_ROUTES } from "../WatchlistModels";
import { getWatchlistBrief } from "./WatchlistBriefEngine";
import { getDecisionAssistant } from "./WatchlistDecisionAssistant";
import { getExecutiveSummary } from "./WatchlistSummaryEngine";
import {
  WATCHLIST_COPILOT_EMPTY,
  emptyCopilotBundle,
  emptyResearchCompanion,
  safeCopilotText,
  type ResearchCompanionSuggestion,
  type ResearchCompanionView,
  type WatchlistCopilotBundle,
  type WatchlistCopilotContext,
} from "./WatchlistCopilotModels";

export function getResearchCompanion(
  context?: WatchlistCopilotContext | null
): ResearchCompanionView {
  const watchlistId = safeCopilotText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyResearchCompanion();
  }

  const intelCtx = context as WatchlistIntelligenceContext;
  const opportunities = getWatchlistOpportunities(intelCtx);
  const recs = getWatchlistRecommendations(intelCtx);
  const research = getWatchlistResearch(context);
  const suggestions: ResearchCompanionSuggestion[] = [];

  for (const sym of symbols.slice(0, 4)) {
    suggestions.push({
      kind: "report",
      label: `Open research report for ${sym}`,
      route: `${WATCHLIST_SURFACE_ROUTES.results}?ticker=${sym}`,
      ticker: sym,
    });
  }

  for (const opp of opportunities.items.filter((o) => o.kind === "upcoming_earnings").slice(0, 3)) {
    suggestions.push({
      kind: "earnings",
      label: `Earnings prep: ${opp.ticker}`,
      route: `${WATCHLIST_SURFACE_ROUTES.company}/${opp.ticker}`,
      ticker: opp.ticker,
    });
  }

  for (const rec of recs.items.filter((r) => r.action === "research_now").slice(0, 3)) {
    suggestions.push({
      kind: "screening",
      label: `Screen ${rec.ticker}`,
      route: `${WATCHLIST_SURFACE_ROUTES.research}?ticker=${rec.ticker}`,
      ticker: rec.ticker,
    });
  }

  if (research.links.length > 0) {
    suggestions.push({
      kind: "alert",
      label: "Review linked watchlist alerts",
      route: WATCHLIST_SURFACE_ROUTES.watchlist,
    });
  }

  const sectorPeers = new Map<string, string[]>();
  const sectors = context?.sectorBySymbol ?? {};
  for (const sym of symbols) {
    const sector = safeCopilotText(sectors[sym], "Other");
    const list = sectorPeers.get(sector) ?? [];
    list.push(sym);
    sectorPeers.set(sector, list);
  }
  const relatedCompanies = [...sectorPeers.values()]
    .filter((g) => g.length > 1)
    .flat()
    .slice(0, 6);

  if (suggestions.length === 0) {
    return emptyResearchCompanion();
  }

  return {
    watchlistId,
    suggestions: suggestions.slice(0, 12),
    relatedCompanies,
    empty: false,
    emptyMessage: WATCHLIST_COPILOT_EMPTY.noSuggestions,
  };
}

let engineInstance: WatchlistCopilotEngine | null = null;

export class WatchlistCopilotEngine {
  getWatchlistBrief = getWatchlistBrief;
  getDecisionAssistant = getDecisionAssistant;
  getExecutiveSummary = getExecutiveSummary;
  getResearchCompanion = getResearchCompanion;

  buildBundle(context?: WatchlistCopilotContext | null): WatchlistCopilotBundle {
    const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
    if (!symbols.length) {
      return emptyCopilotBundle();
    }

    return {
      brief: getWatchlistBrief(context),
      executiveSummary: getExecutiveSummary(context),
      decisions: getDecisionAssistant(context),
      researchCompanion: getResearchCompanion(context),
      empty: false,
      emptyMessage: WATCHLIST_COPILOT_EMPTY.noBrief,
      surfaceHints: { ...WATCHLIST_SURFACE_ROUTES },
    };
  }
}

export function getWatchlistCopilotEngine(): WatchlistCopilotEngine {
  if (!engineInstance) engineInstance = new WatchlistCopilotEngine();
  return engineInstance;
}

export function getWatchlistCopilot(
  context?: WatchlistCopilotContext | null
): WatchlistCopilotBundle {
  return getWatchlistCopilotEngine().buildBundle(context);
}

export const SPRINT_10B_R6_FROZEN = true;

export function resetWatchlistCopilot(): void {
  engineInstance = null;
}

export function isSprint10BR6Frozen(): boolean {
  return SPRINT_10B_R6_FROZEN;
}

export function getWatchlistCopilotHealth(context?: WatchlistCopilotContext | null): {
  ready: boolean;
  briefReady: boolean;
  decisionCount: number;
  suggestionCount: number;
  sprint10BR6Frozen: boolean;
  emptyMessage: string;
} {
  const bundle = getWatchlistCopilot(context);
  return {
    ready: !bundle.empty,
    briefReady: !bundle.brief.empty,
    decisionCount: bundle.decisions.decisions.length,
    suggestionCount: bundle.researchCompanion.suggestions.length,
    sprint10BR6Frozen: SPRINT_10B_R6_FROZEN,
    emptyMessage: bundle.empty ? bundle.emptyMessage : "",
  };
}
