import {
  buildBestCalls,
  buildIntradayOpportunities,
  buildMissedOpportunities,
  buildTomorrowWatchlist,
  flattenRankedPool,
} from "@/lib/opportunity-engine/ranking";
import type {
  OpportunityCandidate,
  OpportunityCategory,
  OpportunityEngineState,
  PostMarketMarketSummary,
  PostMarketReport,
} from "@/lib/opportunity-engine/types";
import { marketBreadth, marketPulse } from "@/services/researchDashboardData";

const EMPTY_SECTION_NOTE =
  "No stocks satisfied today's strict institutional filters. Thresholds were relaxed once — consider widening sector or liquidity criteria tomorrow.";

function buildMarketSummary(state: OpportunityEngineState): PostMarketMarketSummary {
  const sectors = [...marketBreadth.sectors].sort(
    (a, b) => b.changePercent - a.changePercent
  );
  const strongest = sectors[0] ?? { name: "Nifty IT", changePercent: 0 };
  const weakest = sectors[sectors.length - 1] ?? { name: "Nifty Media", changePercent: 0 };

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
  const flowTone = fii >= 0 ? "net buying" : "net selling";

  const narrative = [
    `Nifty breadth ${advanceRatio}% advances with ${marketBreadth.advances} gainers vs ${marketBreadth.declines} decliners.`,
    `${strongest.name} led sectors (+${strongest.changePercent.toFixed(2)}%); ${weakest.name} lagged (${weakest.changePercent.toFixed(2)}%).`,
    `FII ${flowTone} ₹${Math.abs(fii).toLocaleString("en-IN")} Cr; DII ₹${dii.toLocaleString("en-IN")} Cr (${marketPulse.institutionalFlow.asOf}).`,
    `Market trend: ${marketPulse.marketTrend} · Breadth score ${marketPulse.breadthScore}.`,
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

function sectionNoteIfEmpty(
  candidates: OpportunityCandidate[],
  key: "tomorrowWatchlist" | "missedOpportunities" | "bestCallsOfDay"
): string | undefined {
  if (candidates.length > 0) return undefined;
  return EMPTY_SECTION_NOTE;
}

export function generatePostMarketReport(
  state: OpportunityEngineState,
  sessionDate: string
): PostMarketReport {
  const scannedAt = state.lastScannedAt ? new Date(state.lastScannedAt) : new Date();
  const pool = flattenRankedPool(state, scannedAt);
  const intraday = buildIntradayOpportunities(state);

  const bestCallsOfDay = pool.length > 0 ? buildBestCalls(pool, intraday) : [];
  const tomorrowWatchlist = pool.length > 0 ? buildTomorrowWatchlist(pool, intraday) : [];
  const missedOpportunities =
    pool.length > 0
      ? buildMissedOpportunities(pool, bestCallsOfDay, intraday, state.scanHistory, scannedAt)
      : [];

  const sectionNotes: PostMarketReport["sectionNotes"] = {};
  const tomorrowNote = sectionNoteIfEmpty(tomorrowWatchlist, "tomorrowWatchlist");
  const missedNote = sectionNoteIfEmpty(missedOpportunities, "missedOpportunities");
  const bestNote = sectionNoteIfEmpty(bestCallsOfDay, "bestCallsOfDay");
  if (tomorrowNote) sectionNotes.tomorrowWatchlist = tomorrowNote;
  if (missedNote) sectionNotes.missedOpportunities = missedNote;
  if (bestNote) sectionNotes.bestCallsOfDay = bestNote;

  return {
    tomorrowWatchlist,
    missedOpportunities,
    bestCallsOfDay,
    marketSummary: buildMarketSummary(state),
    sectionNotes,
    generatedAt: new Date().toISOString(),
    sessionDate,
  };
}

export function getCategoryCandidates(
  state: OpportunityEngineState,
  category: OpportunityCategory
): OpportunityCandidate[] {
  return state.categories[category] ?? [];
}
