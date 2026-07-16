/**
 * Watchlist Brief Engine — AI morning brief (Sprint 10B.R6).
 * Composes R3 opportunities, R4 alerts, R10A research summary.
 */

import { generateResearchSummary } from "@/src/core/research/workspace/copilot/ResearchSummaryEngine";
import { getWatchlistOpportunities, getWatchlistSummary } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getWatchlistAlerts } from "../workspace";
import {
  WATCHLIST_COPILOT_EMPTY,
  emptyBriefView,
  safeCopilotText,
  type BriefSection,
  type WatchlistBriefView,
  type WatchlistCopilotContext,
} from "./WatchlistCopilotModels";

function section(label: string, items: string[]): BriefSection {
  return { label, items: items.filter(Boolean) };
}

export function getWatchlistBrief(
  context?: WatchlistCopilotContext | null
): WatchlistBriefView {
  const watchlistId = safeCopilotText(context?.watchlistId, "watchlist");
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());

  if (!symbols.length) {
    return emptyBriefView();
  }

  const intelCtx = context as WatchlistIntelligenceContext;
  const opportunities = getWatchlistOpportunities(intelCtx);
  const summary = getWatchlistSummary(intelCtx);
  const alerts = getWatchlistAlerts(context);
  const research = generateResearchSummary({
    workspaceId: context?.workspaceId ?? undefined,
    ticker: symbols[0],
  });

  const oppItems = opportunities.items.slice(0, 5).map(
    (o) => `${o.ticker}: ${o.title} — ${o.reason}`
  );

  const riskItems: string[] = [];
  if (summary.highestRisk) {
    riskItems.push(`${summary.highestRisk.ticker}: ${summary.highestRisk.value}`);
  }
  if (summary.biggestLoser) {
    riskItems.push(`${summary.biggestLoser.ticker}: ${summary.biggestLoser.value}`);
  }

  const earningsItems = opportunities.items
    .filter((o) => o.kind === "upcoming_earnings")
    .map((o) => `${o.ticker}: ${o.reason}`);

  const alertItems = [
    ...alerts.existing.slice(0, 3).map((a) => `${a.ticker}: ${a.title}`),
    ...alerts.upcoming.slice(0, 2).map((a) => `${a.ticker}: ${a.title}`),
  ];

  const avgChange = summary.narrative.includes("average move")
    ? summary.narrative
    : `Monitoring ${symbols.length} companies across the watchlist.`;

  return {
    watchlistId,
    headline: `Morning brief · ${symbols.length} companies · ${new Date(context?.now ?? Date.now()).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}`,
    opportunities: section("Today's Opportunities", oppItems),
    risks: section("Today's Risks", riskItems),
    earnings: section("Today's Earnings", earningsItems),
    alerts: section("Important Alerts", alertItems),
    researchSummary: research.empty
      ? WATCHLIST_COPILOT_EMPTY.awaitingAiSummary
      : research.finalConclusion,
    marketContext: avgChange,
    empty: false,
    emptyMessage: WATCHLIST_COPILOT_EMPTY.noBrief,
  };
}

export class WatchlistBriefEngine {
  getWatchlistBrief = getWatchlistBrief;
}
