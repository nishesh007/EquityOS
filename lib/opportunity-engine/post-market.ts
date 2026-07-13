import { buildAISelfReviews } from "@/lib/opportunity-engine/ai-review";
import { applyCategoryDeduplication } from "@/lib/opportunity-engine/deduplication";
import {
  buildBestCalls,
  buildExpiredSetups,
  buildIntradayOpportunities,
  buildTomorrowWatchlist,
  flattenRankedPool,
} from "@/lib/opportunity-engine/ranking";
import { buildTradeOutcomes } from "@/lib/opportunity-engine/trade-outcome";
import type {
  OpportunityCandidate,
  OpportunityEngineState,
  OpportunityCategory,
  PostMarketMarketSummary,
  PostMarketReport,
} from "@/lib/opportunity-engine/types";
import { marketBreadth, marketPulse } from "@/services/researchDashboardData";

const EMPTY_SECTION_NOTE =
  "No institutional candidates satisfied today's strict filters.";

function sectorShortName(name: string): string {
  return name.replace(/^Nifty\s+/i, "").trim();
}

function flowPhrase(fii: number, dii: number): string {
  if (fii >= 0 && dii >= 0) return "FII and DII buying remained supportive.";
  if (fii >= 0) return "FII buying remained supportive while DII flow was mixed.";
  if (dii >= 0) return "DII buying offset softer FII activity.";
  return "Institutional flows turned cautious with net selling.";
}

function momentumOutlookPhrase(
  advanceRatio: number,
  strongestChange: number,
  _weakestChange: number
): string {
  if (advanceRatio >= 60 && strongestChange > 0.8) {
    return "Momentum continues to favor long setups although several sectors appear extended after today's move.";
  }
  if (advanceRatio >= 55) {
    return "Momentum remains constructive for selective long setups into the next session.";
  }
  if (advanceRatio < 45) {
    return "Momentum has shifted defensive — stock selection over index exposure is warranted.";
  }
  return "Momentum is mixed — leadership is rotating and setups require tighter confirmation.";
}

function buildMarketSummary(state: OpportunityEngineState): PostMarketMarketSummary {
  const sectors = [...marketBreadth.sectors].sort(
    (a, b) => b.changePercent - a.changePercent
  );
  const strongest = sectors[0] ?? { name: "Nifty IT", changePercent: 0 };
  const weakest = sectors[sectors.length - 1] ?? { name: "Nifty Media", changePercent: 0 };
  const leaders = sectors
    .filter((sector) => sector.changePercent > 0)
    .slice(0, 2)
    .map((sector) => sectorShortName(sector.name));
  const laggards = sectors
    .filter((sector) => sector.changePercent < 0)
    .slice(-2)
    .map((sector) => sectorShortName(sector.name));

  const total =
    marketBreadth.advances + marketBreadth.declines + marketBreadth.unchanged;
  const advanceRatio = total > 0 ? Math.round((marketBreadth.advances / total) * 100) : 50;

  const breakouts = (state.categories.breakout ?? []).slice(0, 5);
  const breakdowns = [
    ...(state.categories.momentum ?? []),
    ...(state.categories.mean_reversion ?? []),
  ]
    .filter((c) => c.side === "Short")
    .slice(0, 5);
  const volumeShock = (state.categories.relative_volume ?? []).slice(0, 5);

  const fii = marketPulse.institutionalFlow.fii;
  const dii = marketPulse.institutionalFlow.dii;

  const leaderText =
    leaders.length >= 2
      ? `${leaders[0]} and ${leaders[1]}`
      : leaders.length === 1
        ? leaders[0]
        : sectorShortName(strongest.name);
  const laggardText =
    laggards.length > 0 ? laggards.join(" and ") : sectorShortName(weakest.name);

  const rallyVerb = strongest.changePercent > 1 ? "rally" : "session";
  const leaderClause =
    leaders.length >= 2
      ? `Today's ${rallyVerb} was led by ${leaderText} while ${laggardText} remained weak.`
      : `Today's ${rallyVerb} was led by ${leaderText} while ${laggardText} lagged.`;

  const breadthClause =
    advanceRatio >= 55
      ? `Market breadth remained healthy with ${advanceRatio}% advancing stocks.`
      : advanceRatio >= 45
        ? `Market breadth was balanced with ${advanceRatio}% advancing stocks.`
        : `Market breadth narrowed to ${advanceRatio}% advancing stocks.`;

  const narrative = [
    leaderClause,
    breadthClause,
    flowPhrase(fii, dii),
    momentumOutlookPhrase(advanceRatio, strongest.changePercent, weakest.changePercent),
  ].join(" ");

  return {
    narrative,
    strongestSector: { name: strongest.name, changePercent: strongest.changePercent },
    weakestSector: { name: weakest.name, changePercent: weakest.changePercent },
    breadth: {
      advances: marketBreadth.advances,
      declines: marketBreadth.declines,
      unchanged: marketBreadth.unchanged,
      advanceRatio,
    },
    institutionalFlow: {
      fii: marketPulse.institutionalFlow.fii,
      dii: marketPulse.institutionalFlow.dii,
      asOf: marketPulse.institutionalFlow.asOf,
    },
    topBreakouts: breakouts,
    topBreakdowns: breakdowns,
    topVolumeShock: volumeShock,
  };
}

function sectionNoteIfEmpty(candidates: OpportunityCandidate[]): string | undefined {
  if (candidates.length > 0) return undefined;
  return EMPTY_SECTION_NOTE;
}

function collectTradeCandidates(
  bestCalls: OpportunityCandidate[],
  intraday: OpportunityCandidate[]
): OpportunityCandidate[] {
  const seen = new Set<string>();
  const result: OpportunityCandidate[] = [];

  for (const candidate of [...bestCalls, ...intraday]) {
    const key = candidate.symbol.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }

  return result;
}

export function generatePostMarketReport(
  state: OpportunityEngineState,
  sessionDate: string
): PostMarketReport {
  const dedupedState = applyCategoryDeduplication(state);
  const scannedAt = dedupedState.lastScannedAt
    ? new Date(dedupedState.lastScannedAt)
    : new Date();
  const pool = flattenRankedPool(dedupedState, scannedAt);
  const intraday = buildIntradayOpportunities(dedupedState);

  const bestCallsOfDay = pool.length > 0 ? buildBestCalls(pool, intraday) : [];
  const tomorrowWatchlist =
    pool.length > 0 ? buildTomorrowWatchlist(pool, intraday) : buildTomorrowWatchlist([], intraday);
  const missedOpportunities =
    pool.length > 0
      ? buildExpiredSetups(
          pool,
          bestCallsOfDay,
          intraday,
          dedupedState.scanHistory,
          scannedAt
        )
      : [];

  const tradeCandidates = collectTradeCandidates(bestCallsOfDay, intraday);
  const tradeOutcomes = buildTradeOutcomes(tradeCandidates);
  const aiReviews = buildAISelfReviews(tradeCandidates, tradeOutcomes);

  const sectionNotes: PostMarketReport["sectionNotes"] = {};
  const tomorrowNote = sectionNoteIfEmpty(tomorrowWatchlist);
  const missedNote = sectionNoteIfEmpty(missedOpportunities);
  const bestNote = sectionNoteIfEmpty(bestCallsOfDay);
  if (tomorrowNote) sectionNotes.tomorrowWatchlist = tomorrowNote;
  if (missedNote) sectionNotes.missedOpportunities = missedNote;
  if (bestNote) sectionNotes.bestCallsOfDay = bestNote;

  return {
    tomorrowWatchlist,
    missedOpportunities,
    bestCallsOfDay,
    tradeOutcomes,
    aiReviews,
    marketSummary: buildMarketSummary(dedupedState),
    sectionNotes,
    generatedAt: new Date().toISOString(),
    sessionDate,
  };
}

export function getCategoryCandidates(
  state: OpportunityEngineState,
  category: OpportunityCategory
): OpportunityCandidate[] {
  const deduped = applyCategoryDeduplication(state);
  return deduped.categories[category] ?? [];
}
