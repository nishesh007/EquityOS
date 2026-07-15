/**
 * Dashboard presenter — empty-safe metrics and scorecard labels.
 */

import { daysUntilResult } from "@/src/core/earnings/calendar";
import type { EarningsCalendarEvent } from "@/src/core/earnings/calendar";
import type {
  EarningsDashboardMetrics,
  EarningsDashboardViewModel,
  RankedCardPresentation,
  RankedEarningsItem,
} from "./EarningsDashboardModels";
import { DASHBOARD_EMPTY } from "./EarningsDashboardModels";
import { isHighConvictionItem } from "./EarningsPriorityEngine";

function safeText(value: string | null | undefined, fallback: string): string {
  if (value == null) return fallback;
  const trimmed = String(value).trim();
  if (
    !trimmed ||
    trimmed === "undefined" ||
    trimmed === "null" ||
    trimmed === "NaN"
  ) {
    return fallback;
  }
  return trimmed;
}

function avgLabel(values: number[]): string {
  if (values.length === 0) return DASHBOARD_EMPTY.awaitingAi;
  const avg = Math.round(
    values.reduce((sum, v) => sum + v, 0) / values.length
  );
  if (!Number.isFinite(avg) || avg <= 0) return DASHBOARD_EMPTY.awaitingAi;
  return String(avg);
}

export function buildDashboardMetrics(
  events: readonly EarningsCalendarEvent[],
  scored: readonly RankedEarningsItem[],
  now = new Date()
): EarningsDashboardMetrics {
  let todays = 0;
  let tomorrow = 0;
  let next7 = 0;
  let portfolio = 0;
  let watchlist = 0;
  let highImpact = 0;

  for (const event of events) {
    const days = daysUntilResult(event.resultDate, now);
    if (days === 0) todays += 1;
    if (days === 1) tomorrow += 1;
    if (days != null && days >= 0 && days <= 7) next7 += 1;
    if (event.inPortfolio && days != null && days >= 0) portfolio += 1;
    if (event.inWatchlist && days != null && days >= 0) watchlist += 1;
    if (event.highImpact && days != null && days >= 0) highImpact += 1;
  }

  const conviction = scored.filter(isHighConvictionItem).length;
  const beatVals = scored
    .filter((s) => s.scorecard.available)
    .map((s) => s.scorecard.beatProbability);
  const confVals = scored
    .filter((s) => s.scorecard.available)
    .map((s) => s.scorecard.aiConfidence);

  const upcoming = events.filter((e) => {
    const d = daysUntilResult(e.resultDate, now);
    return d != null && d >= 0;
  }).length;

  return {
    upcomingEarnings: upcoming,
    todaysEarnings: todays,
    tomorrowEarnings: tomorrow,
    next7Days: next7,
    portfolioEarnings: portfolio,
    watchlistEarnings: watchlist,
    highImpactEarnings: highImpact,
    aiHighConviction: conviction,
    averageBeatProbability: avgLabel(beatVals),
    averageAiConfidence: avgLabel(confVals),
    portfolioExposure:
      upcoming > 0
        ? `${Math.round((portfolio / upcoming) * 100)}%`
        : DASHBOARD_EMPTY.noUpcoming,
    watchlistExposure:
      upcoming > 0
        ? `${Math.round((watchlist / upcoming) * 100)}%`
        : DASHBOARD_EMPTY.noUpcoming,
    ready: scored.some((s) => s.scorecard.available) || upcoming > 0,
  };
}

export function toRankedCardPresentation(
  item: RankedEarningsItem
): RankedCardPresentation {
  const s = item.scorecard;
  if (!s.available && s.aiConfidence <= 0) {
    return {
      ticker: item.event.ticker,
      companyName: item.event.companyName,
      institutionalScoreLabel: DASHBOARD_EMPTY.awaitingAi,
      aiConfidenceLabel: DASHBOARD_EMPTY.awaitingAi,
      beatProbabilityLabel: DASHBOARD_EMPTY.awaitingAi,
      riskLabel: DASHBOARD_EMPTY.awaitingAi,
      opportunityLabel: DASHBOARD_EMPTY.awaitingAi,
      attentionLevel: s.attentionLevel,
      priority: s.priority,
      portfolioImpactLabel: item.event.inPortfolio ? "Portfolio" : "—",
      watchlistImpactLabel: item.event.inWatchlist ? "Watchlist" : "—",
      outlook: s.outlook,
      heatLevel: s.attentionLevel,
      badges: [],
      ready: false,
      emptyMessage: DASHBOARD_EMPTY.awaitingAi,
    };
  }

  const badges: string[] = [s.priority, s.attentionLevel, s.outlook];
  if (item.event.highImpact) badges.push("High Impact");
  if (isHighConvictionItem(item)) badges.push("High Conviction");
  if (s.transcriptAvailable) badges.push("Transcript");

  return {
    ticker: item.event.ticker,
    companyName: safeText(item.event.companyName, item.event.ticker),
    institutionalScoreLabel: String(s.institutionalScore),
    aiConfidenceLabel: String(s.aiConfidence),
    beatProbabilityLabel: String(s.beatProbability),
    riskLabel: String(s.riskScore),
    opportunityLabel: String(s.opportunityScore),
    attentionLevel: s.attentionLevel,
    priority: s.priority,
    portfolioImpactLabel: item.event.inPortfolio
      ? String(s.portfolioImpact)
      : "—",
    watchlistImpactLabel: item.event.inWatchlist
      ? String(s.watchlistImpact)
      : "—",
    outlook: s.outlook,
    heatLevel: s.attentionLevel,
    badges,
    ready: true,
    emptyMessage: "",
  };
}

export function presentDashboardPage(input: {
  metrics: EarningsDashboardMetrics;
  ranked: RankedEarningsItem[];
  page?: number;
  pageSize?: number;
  emptyMessage?: string;
}): EarningsDashboardViewModel {
  const safePageSize = Math.max(1, input.pageSize ?? 8);
  const total = input.ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, input.page ?? 1), totalPages);
  const start = (safePage - 1) * safePageSize;
  const pageItems = input.ranked.slice(start, start + safePageSize);

  const empty = pageItems.length === 0;
  return {
    metrics: input.metrics,
    items: pageItems,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    empty,
    emptyMessage: empty
      ? input.emptyMessage ?? DASHBOARD_EMPTY.noMatchingFilters
      : "",
    highConviction: input.ranked.filter(isHighConvictionItem).slice(0, 8),
    portfolio: input.ranked.filter((r) => r.event.inPortfolio).slice(0, 8),
    watchlist: input.ranked.filter((r) => r.event.inWatchlist).slice(0, 8),
  };
}
